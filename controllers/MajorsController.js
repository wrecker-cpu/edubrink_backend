const NodeCache = require("node-cache");
const MajorsModel = require("../models/MajorsModel");
const FacultyModel = require("../models/FacultyModel");

const { createNotification } = require("../controllers/HelperController");
const UniversityModel = require("../models/UniversityModel");

// Create a new Majors
const createMajors = async (req, res) => {
  try {
    const { faculty, university, ...majorDetails } = req.body; // Extract faculty & university IDs

    // Step 1: Create a new major with faculty and university references
    const newMajor = new MajorsModel({ ...majorDetails, faculty, university });
    await newMajor.save();

    // Create a notification for the new major
    await createNotification("Major", newMajor, "majorName", "created");

    // Step 2: If a faculty is provided, add the major ID to the faculty's `major` array
    if (faculty) {
      await FacultyModel.findByIdAndUpdate(
        faculty,
        { $push: { major: newMajor._id } }, // Add major ID to faculty's major array
        { new: true }
      );
    }

    // Step 3: If a university is provided, add the major ID to the university's `major` array
    if (university) {
      await UniversityModel.findByIdAndUpdate(
        university,
        { $push: { major: newMajor._id } }, // Correct field should be 'major'
        { new: true }
      );
    }

    res.status(201).json({
      data: newMajor,
      message: "Major created successfully and linked to faculty/university!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a Majors by ID
const getMajorsById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the Majors and populate the 'universities' field
    const MajorsData = await MajorsModel.findById(id)
      .populate("university")
      .lean();
    if (!MajorsData) {
      return res.status(404).json({ message: "Majors not found" });
    }
    res.status(200).json({ data: MajorsData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMajorsByName = async (req, res) => {
  const name = req.params.name;
  try {
    const majorData = await MajorsModel.findOne({
      $or: [
        { "majorName.en": name },
        { "majorName.ar": name },
        { "customURLSlug.en": name },
        { "customURLSlug.ar": name },
      ],
    })
      .populate({
        path: "university",
        select: "uniName customURLSlug uniSymbol",
      })
      .lean();

    if (!majorData) {
      return res.status(404).json({ message: "Major not found" });
    }
    res.status(200).json({ data: majorData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllMajors = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      majorTuitionFees,
      majorTuitionFeesMin,
      majorTuitionFeesMax,
      scholarships,
      featured,
      duration,
      durationUnit,
      sortBy,
      sortDirection,
    } = req.query;

    // Parse query parameters
    const parsedPage = parseInt(page) || 1; // Default page is 1
    const parsedLimit = parseInt(limit) || 10; // Default limit is 10
    const skip = (parsedPage - 1) * parsedLimit; // Calculate the number of documents to skip

    // Build the query for filtering
    const query = {};
    
    // Handle search term
    if (search) {
      // Step 1: Fetch matching universities based on the search term
      const matchingUniversities = await UniversityModel.find(
        { "uniName.en": { $regex: search, $options: "i" } },
        { _id: 1 } // Only fetch the `_id` field
      );

      // Extract the `_id`s of matching universities
      const universityIds = matchingUniversities.map((uni) => uni._id);

      // Step 2: Build the query for majors
      query.$or = [
        { "majorName.en": { $regex: search, $options: "i" } }, // Search in majorName
        { university: { $in: universityIds } }, // Search in university IDs
      ];
    }

    // Handle tuition fees (as numeric values, not regex)
    if (majorTuitionFees) {
      // Exact match for tuition fees
      query.majorTuitionFees = parseFloat(majorTuitionFees);
    } else {
      // Handle min/max ranges if provided
      if (majorTuitionFeesMin || majorTuitionFeesMax) {
        query.majorTuitionFees = {};
        
        if (majorTuitionFeesMin) {
          query.majorTuitionFees.$gte = parseFloat(majorTuitionFeesMin);
        }
        
        if (majorTuitionFeesMax) {
          query.majorTuitionFees.$lte = parseFloat(majorTuitionFeesMax);
        }
      }
    }

    // Handle other filters
    if (scholarships === "true") {
      query["majorCheckBox.scholarshipsAvailable"] = true;
    }
    if (featured === "true") {
      query["majorCheckBox.featuredMajor"] = true;
    }

    if (duration && durationUnit) {
      const parsedDuration = parseFloat(duration); // Convert duration to a number
      if (!isNaN(parsedDuration)) {
        query.duration = parsedDuration;
        query.durationUnits = durationUnit;
      }
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy) {
      // Handle different sort fields
      if (sortBy === "name") {
        sortOptions["majorName.en"] = sortDirection === "desc" ? -1 : 1;
      } else if (sortBy === "duration") {
        sortOptions.duration = sortDirection === "desc" ? -1 : 1;
      } else if (sortBy === "tuition") {
        sortOptions.majorTuitionFees = sortDirection === "desc" ? -1 : 1;
      } else {
        // Default sort
        sortOptions[sortBy] = sortDirection === "desc" ? -1 : 1;
      }
    }

    // Fetch majors with pagination, filtering, and populate the `university` field
    const majors = await MajorsModel.find(query)
      .populate({
        path: "university", // Populate the `university` field
        select: "uniName", // Only fetch the `uniName` field
      })
      .sort(sortOptions) // Apply sorting
      .skip(skip) // Skip documents for pagination
      .limit(parsedLimit) // Limit the number of documents
      .lean(); // Convert to plain JavaScript objects

    // Get the total count of majors for pagination metadata (with the same filter)
    const totalCount = await MajorsModel.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.status(200).json({
      data: majors,
      pagination: {
        totalCount, // Total number of majors
        totalPages, // Total number of pages
        currentPage: parsedPage, // Current page
        limit: parsedLimit, // Number of majors per page
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Majors by ID
const updateMajors = async (req, res) => {
  const id = req.params.id;
  try {
    const { faculty, university, ...majorDetails } = req.body; // Extract faculty & university separately

    // Step 1: Find the existing major
    const existingMajor = await MajorsModel.findById(id);
    if (!existingMajor) {
      return res.status(404).json({ message: "Major not found" });
    }

    // Step 3: If university is updated, adjust references
    if (
      university &&
      university.toString() !== existingMajor.university?.toString()
    ) {
      // Remove major ID from old university
      if (existingMajor.university) {
        await UniversityModel.findByIdAndUpdate(existingMajor.university, {
          $pull: { major: id },
        });
      }

      // Add major ID to the new university
      await UniversityModel.findByIdAndUpdate(university, {
        $addToSet: { major: id }, // Avoid duplicates
      });

      // Update the major with new university reference
      majorDetails.university = university;
    }

    // Step 4: Update the major details
    const updatedMajor = await MajorsModel.findByIdAndUpdate(id, majorDetails, {
      new: true,
    }).lean();

    await createNotification("Major", updatedMajor, "majorName", "updated");

    res.status(200).json({
      data: updatedMajor,
      message: "Major updated successfully with faculty/university references!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Majors by ID
const deleteMajors = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find the major to check if it exists
    const existingMajor = await MajorsModel.findById(id);
    if (!existingMajor) {
      return res.status(404).json({ message: "Major not found" });
    }

    // Step 2: Remove the major ID from the associated Faculty
    if (existingMajor.faculty) {
      await FacultyModel.findByIdAndUpdate(existingMajor.faculty, {
        $pull: { major: id },
      });
    }

    // Step 3: Remove the major ID from the associated University
    if (existingMajor.university) {
      await UniversityModel.findByIdAndUpdate(existingMajor.university, {
        $pull: { major: id },
      });
    }

    // Step 4: Delete the major
    const deletedMajor = await MajorsModel.findByIdAndDelete(id);

    await createNotification("Major", deletedMajor, "majorName", "deleted");

    res.status(200).json({
      message:
        "Major deleted successfully and removed from faculty/university!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createMajors,
  getMajorsById,
  getAllMajors,
  getMajorsByName,
  updateMajors,
  deleteMajors,
};
