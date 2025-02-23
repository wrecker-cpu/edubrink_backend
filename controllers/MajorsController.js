const NodeCache = require("node-cache");
const MajorsModel = require("../models/MajorsModel");

// Create a new Majors
const createMajors = async (req, res) => {
  try {
    const TagData = new MajorsModel(req.body);
    await TagData.save();
    res.status(201).json({
      data: TagData,
      message: "Tag created successfully",
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
    const Majors = await MajorsModel.find().lean();

    res.status(200).json({ data: Majors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Majors by ID
const updateMajors = async (req, res) => {
  const id = req.params.id;
  try {
    const MajorsData = await MajorsModel.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();
    if (!MajorsData) {
      return res.status(404).json({ message: "Majors not found" });
    }
    res
      .status(200)
      .json({ data: MajorsData, message: "Majors updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Majors by ID
const deleteMajors = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedMajors = await MajorsModel.findByIdAndDelete(id);
    if (!deletedMajors) {
      return res.status(404).json({ message: "Majors not found" });
    }
    res.status(200).json({ message: "Majors deleted successfully" });
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
