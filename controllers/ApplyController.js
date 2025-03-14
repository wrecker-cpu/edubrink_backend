const NodeCache = require("node-cache");
const ApplyModel = require("../models/ApplyModel");

// Create a new Apply
const createApply = async (req, res) => {
  try {
    const { category } = req.body;

    // Validate if category is valid
    const allowedCategories = ["University", "Course"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    const newApplyData = new ApplyModel(req.body);
    await newApplyData.save(); // Save the new record

    return res.status(201).json({
      message: "Apply created successfully",
      data: newApplyData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a Apply by ID
const getApplyById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the Apply and populate the 'universities' field
    const ApplyData = await ApplyModel.findById(id)
    .populate({
      path: "itemId",
      select: "CourseName uniName",
    })
    .lean();
    if (!ApplyData) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res.status(200).json({ data: ApplyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllApply = async (req, res) => {
  try {
    const Apply = await ApplyModel.find()
      .populate({
        path: "itemId",
        select: "CourseName uniName countryName",
      })
      .lean();

    res.status(200).json({ data: Apply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Apply by ID
const updateApply = async (req, res) => {
  const id = req.params.id;
  try {
    const ApplyData = await ApplyModel.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();
    if (!ApplyData) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res
      .status(200)
      .json({ data: ApplyData, message: "Apply updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Apply by ID
const deleteApply = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedApply = await ApplyModel.findByIdAndDelete(id);
    if (!deletedApply) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res.status(200).json({ message: "Apply deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createApply,
  getApplyById,
  getAllApply,
  updateApply,
  deleteApply,
};
