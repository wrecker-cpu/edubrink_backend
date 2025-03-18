const NodeCache = require("node-cache");
const FacultyModel = require("../models/FacultyModel");
const UniversityModel = require("../models/UniversityModel");
const mongoose = require("mongoose");
const MajorModel = require("../models/MajorsModel");
const { createNotification } = require("../controllers/HelperController");

// Create a new Faculty
const createFaculty = async (req, res) => {
  try {
    const { universities, ...facultyDetails } = req.body; // Extract university & major IDs

    // Step 1: Create the faculty
    const newFaculty = new FacultyModel(facultyDetails);
    await newFaculty.save();

    await createNotification("Faculty", newFaculty, "facultyName", "created");

    // Step 2: If universities are provided, update references
    if (universities) {
      await UniversityModel.findByIdAndUpdate(
        universities,
        { $push: { faculty: newFaculty._id } }, // Push faculty ID into university
        { new: true }
      );

      newFaculty.universities = universities; // Assign university to faculty
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

const getFacultyById = async (req, res) => {
  const { id } = req.params;
  try {
    let matchCondition = {};

    // Check if the provided param is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      matchCondition = { _id: new mongoose.Types.ObjectId(id) };
    } else {
      // Match by slug if it's not an ObjectId
      matchCondition = {
        $or: [
          { "facultyName.en": id },
          { "facultyName.ar": id },
          { "customURLSlug.en": id },
          { "customURLSlug.ar": id },
        ],
      };
    }

    const FacultyData = await FacultyModel.findOne(matchCondition)
      .populate({
        path: "universities",
        select:
          "uniName countryFlag uniSymbol countryCode uniMainImage uniCountry faculty uniTutionFees courseId", // Replace with the fields you need,
        populate: {
          path: "uniCountry",
          select: "countryName", // Only fetch countryName from uniCountry
        },
        populate: {
          path: "faculty",
          select: "facultyName customURLSlug", // Only fetch countryName from uniCountry
        },
      })
      .populate({
        path: "major",
        select: "majorName majorTuitionFees", // Replace with required fields
        options: { limit: 4 }, // Limit to 4
      })
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
    // Parse query parameters
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Define the fields to select
    const selectedFields = {
      facultyName: 1, // Include the `facultyName` field
      facultyFeatured: 1, // Include the `facultyFeatured` field
      universities: 1, // Include the `universities` field
      created_at: 1, // Include the `created_at` field
      _id: 1, // Include the `_id` field
    };

    // Aggregation pipeline to fetch faculties with pagination and count `major` field
    const faculties = await FacultyModel.aggregate([
      {
        $project: {
          ...selectedFields, // Include selected fields
          majorCount: { $size: "$major" }, // Count the number of elements in the `major` array
        },
      },
      { $skip: skip }, // Skip documents for pagination
      { $limit: limit }, // Limit the number of documents
      {
        $lookup: {
          from: "universities", // Populate the `universities` field
          localField: "universities",
          foreignField: "_id",
          as: "universities",
          pipeline: [
            {
              $project: {
                uniName: "$uniName.en", // Extract only the `en` field from `uniName`
              },
            },
          ],
        },
      },
      {
        $addFields: {
          universities: {
            $map: {
              input: "$universities",
              as: "uni",
              in: "$$uni.uniName", // Transform the array to only include `uniName` strings
            },
          },
        },
      },
    ]);

    // Get the total count of faculties for pagination metadata
    const totalCount = await FacultyModel.countDocuments();

    // Get the total count of featured faculties
    const totalFeaturedCount = await FacultyModel.countDocuments({
      facultyFeatured: true,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: faculties,
      pagination: {
        totalCount, // Total number of faculties
        totalPages, // Total number of pages
        currentPage: page, // Current page
        totalFeaturedCount, // Total number of featured faculties
        limit, // Number of faculties per page
      },
    });
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

    await createNotification(
      "Faculty",
      updatedFaculty,
      "facultyName",
      "updated"
    );

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

    await createNotification(
      "Faculty",
      deletedFaculty,
      "facultyName",
      "deleted"
    );

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
