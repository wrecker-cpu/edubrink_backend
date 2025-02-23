const NodeCache = require("node-cache");
const FacultyModel = require("../models/FacultyModel");

// Create a new Faculty
const createFaculty = async (req, res) => {
  try {
    const TagData = new FacultyModel(req.body);
    await TagData.save();
    res.status(201).json({
      data: TagData,
      message: "Tag created successfully",
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
      .populate("university")
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
    const Faculty = await FacultyModel.find().lean();

    res.status(200).json({ data: Faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Faculty by ID
const updateFaculty = async (req, res) => {
  const id = req.params.id;
  try {
    const FacultyData = await FacultyModel.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();
    if (!FacultyData) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    res
      .status(200)
      .json({ data: FacultyData, message: "Faculty updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Faculty by ID
const deleteFaculty = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedFaculty = await FacultyModel.findByIdAndDelete(id);
    if (!deletedFaculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    res.status(200).json({ message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createFaculty,
  getFacultyById,
  getAllFaculty,
  updateFaculty,
  deleteFaculty,
};
