const NodeCache = require("node-cache");
const MajorsModel = require("../models/MajorsModel");
const FacultyModel = require("../models/FacultyModel");
const { createNotification } = require("../controllers/HelperController");

// Create a new Majors
const createMajors = async (req, res) => {
  try {
    const { faculty, ...majorDetails } = req.body; // Extract faculty ID

    // Step 1: Create a new major
    const newMajor = new MajorsModel(majorDetails);
    await newMajor.save();

    await createNotification("Major", newMajor, "majorName", "created");

    // Step 2: If a faculty is provided, add the major ID to the faculty's major array
    if (faculty) {
      await FacultyModel.findByIdAndUpdate(
        faculty,
        { $push: { major: newMajor._id } }, // Add major ID to faculty's major array
        { new: true }
      );

      // Also update the faculty reference in the Major itself
      newMajor.faculty = faculty;
      await newMajor.save();
    }

    res.status(201).json({
      data: newMajor,
      message: "Major created successfully and linked to faculty!",
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
      .populate("faculty")
      .lean();
    if (!MajorsData) {
      return res.status(404).json({ message: "Majors not found" });
    }
    res.status(200).json({ data: MajorsData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllMajors = async (req, res) => {
  try {
    const Majors = await MajorsModel.find()
      .populate({
        path: "faculty",
        select: "facultyName",
        populate: {
          path: "universities", // Assuming "universities" is the reference in Faculty model
          select: "uniName", // Only fetching uniName
        },
      })
      .lean();

    res.status(200).json({ data: Majors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Majors by ID
const updateMajors = async (req, res) => {
  const id = req.params.id;
  try {
    const { faculty, ...majorDetails } = req.body; // Extract faculty ID separately

    // Step 1: Find the existing major
    const existingMajor = await MajorsModel.findById(id);
    if (!existingMajor) {
      return res.status(404).json({ message: "Major not found" });
    }

    // Step 2: If faculty is updated, adjust references
    if (faculty && faculty.toString() !== existingMajor.faculty?.toString()) {
      // Remove major ID from old faculty
      if (existingMajor.faculty) {
        await FacultyModel.findByIdAndUpdate(existingMajor.faculty, {
          $pull: { major: id },
        });
      }

      // Add major ID to the new faculty
      await FacultyModel.findByIdAndUpdate(faculty, {
        $addToSet: { major: id }, // Avoid duplicates
      });

      // Step 3: Update the major with new faculty reference
      majorDetails.faculty = faculty;
    }

    // Step 4: Update the major details
    const updatedMajor = await MajorsModel.findByIdAndUpdate(id, majorDetails, {
      new: true,
    }).lean();

    await createNotification("Major", updatedMajor, "majorName", "updated");

    res.status(200).json({
      data: updatedMajor,
      message: "Major updated successfully with faculty reference!",
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

    // Step 3: Delete the major
    const deletedMajor = await MajorsModel.findByIdAndDelete(id);

    await createNotification("Major", deletedMajor, "majorName", "deleted");

    res.status(200).json({
      message: "Major deleted successfully and removed from faculty!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createMajors,
  getMajorsById,
  getAllMajors,
  updateMajors,
  deleteMajors,
};
