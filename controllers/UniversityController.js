const universityModel = require("../models/UniversityModel");

// Create a new University
const createUniversity = async (req, res) => {
  try {
    const universityData = new universityModel(req.body);
    await universityData.save();
    res
      .status(201)
      .json({ data: universityData, message: "University created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a University by ID
const getUniversityById = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel.findById(id).lean();
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ data: universityData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all Universities
const getAllUniversities = async (req, res) => {
  try {
    const universities = await universityModel.find().lean();
    res.status(200).json({ data: universities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a University by ID
const updateUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res
      .status(200)
      .json({ data: universityData, message: "University updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a University by ID
const deleteUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedUniversity = await universityModel.findByIdAndDelete(id);
    if (!deletedUniversity) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ message: "University deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createUniversity,
  getUniversityById,
  getAllUniversities,
  updateUniversity,
  deleteUniversity,
};
