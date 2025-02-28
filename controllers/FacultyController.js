const NodeCache = require("node-cache");
const FacultyModel = require("../models/FacultyModel");
const UniversityModel = require("../models/UniversityModel");
const MajorModel = require("../models/MajorsModel");

// Create a new Faculty
const createFaculty = async (req, res) => {
  try {
    const { universities, major, ...facultyDetails } = req.body; // Extract university & major IDs

    // Step 1: Create the faculty
    const newFaculty = new FacultyModel(facultyDetails);
    await newFaculty.save();

    // Step 2: If universities are provided, update references
    if (universities) {
      await UniversityModel.findByIdAndUpdate(
        universities,
        { $push: { faculty: newFaculty._id } }, // Push faculty ID into university
        { new: true }
      );

      newFaculty.universities = universities; // Assign university to faculty
    }

    // Step 3: If majors are provided, update MajorModel to reference the new faculty
    if (major && major.length > 0) {
      await MajorModel.updateMany(
        { _id: { $in: major } }, // Find all matching major IDs
        { $set: { faculty: newFaculty._id } } // Update the faculty field (not an array)
      );

      newFaculty.major = major; // Assign majors to faculty
    }

    // Step 4: Save updated faculty data
    await newFaculty.save();

    res.status(201).json({
      data: newFaculty,
      message:
        "Faculty created successfully and linked to university and majors!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a Faculty by ID
const getFacultyById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the Faculty and populate the 'universities' field
    const FacultyData = await FacultyModel.findById(id)
      .populate("universities major")
      .lean();
    if (!FacultyData) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    res.status(200).json({ data: FacultyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllFaculty = async (req, res) => {
  try {
    const Faculty = await FacultyModel.find().populate("major").lean();

    res.status(200).json({ data: Faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllFacultyWithUniNames = async (req, res) => {
  try {
    const facultyData = await FacultyModel.aggregate([
      // Step 1: Lookup universities that reference this faculty
      {
        $lookup: {
          from: "universities", // University collection
          localField: "_id", // Faculty _id in FacultyModel
          foreignField: "faculty", // The `faculty` array in University model
          as: "universities", // Store matched universities here
        },
      },
      {
        $project: {
          facultyName: 1, // Keep Faculty Name
          facultyDescription: 1, // Keep Faculty Description
          uniName: "$universities.uniName", // Extract university names
        },
      },
    ]);

    res.status(200).json({ data: facultyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Faculty by ID
const updateFaculty = async (req, res) => {
  const id = req.params.id;
  try {
    const { universities, major, ...facultyDetails } = req.body; // Extract universities & majors

    // Step 1: Find existing faculty
    const existingFaculty = await FacultyModel.findById(id);
    if (!existingFaculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Step 2: Remove faculty ID from old universities
    if (existingFaculty.universities?.length) {
      await UniversityModel.updateMany(
        { _id: { $in: existingFaculty.universities } },
        { $pull: { faculty: id } }
      );
    }

    // Step 3: Add faculty ID to new universities (if provided)
    if (universities?.length) {
      await UniversityModel.updateMany(
        { _id: { $in: universities } },
        { $addToSet: { faculty: id } } // Prevent duplicate IDs
      );
    }

    // Step 4: Handle major updates
    if (major) {
      // Remove faculty reference from majors that are no longer linked
      await MajorModel.updateMany(
        { faculty: id, _id: { $nin: major } }, // Majors that are NOT in the new list
        { $unset: { faculty: "" } } // Remove faculty reference
      );

      // Assign the faculty reference to the newly linked majors
      await MajorModel.updateMany(
        { _id: { $in: major } }, // Only update majors that should have this faculty
        { $set: { faculty: id } }
      );

      facultyDetails.major = major; // Update faculty document with new majors
    }

    // Step 5: Update faculty details with new universities and majors
    facultyDetails.universities = universities || [];

    const updatedFaculty = await FacultyModel.findByIdAndUpdate(
      id,
      facultyDetails,
      { new: true }
    ).lean();

    res.status(200).json({
      data: updatedFaculty,
      message: "Faculty updated successfully with universities and majors!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteFaculty = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find and delete the faculty
    const deletedFaculty = await FacultyModel.findByIdAndDelete(id);
    if (!deletedFaculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Step 2: Remove faculty ID from all universities that reference it
    await UniversityModel.updateMany(
      { faculty: id },
      { $pull: { faculty: id } }
    );

    // Step 3: Unset faculty reference in all majors that were linked to this faculty
    await MajorModel.updateMany(
      { faculty: id },
      { $unset: { faculty: "" } } // Remove faculty reference from major
    );

    res.status(200).json({
      message:
        "Faculty deleted successfully and removed from universities and majors!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createFaculty,
  getFacultyById,
  getAllFaculty,
  getAllFacultyWithUniNames,
  updateFaculty,
  deleteFaculty,
};
