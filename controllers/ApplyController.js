const NodeCache = require("node-cache");
const ApplyModel = require("../models/ApplyModel");

// Create a new Apply
const createApply = async (req, res) => {
  try {
    const { itemId, category, clicks } = req.body;

    // Validate if category is valid
    const allowedCategories = ["University", "Country", "Blog", "Course"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Check if the Apply data for the itemId and category already exists
    const existingApply = await ApplyModel.findOne({ itemId, category });

    if (existingApply) {
      // If the record exists, increment the clicks and update the last clicked time
      existingApply.clicks += clicks;
      existingApply.lastClickedAt = Date.now();

      await existingApply.save(); // Save the updated record

      return res.status(200).json({
        message: "Apply updated successfully",
        data: existingApply,
      });
    } else {
      // If the record does not exist, create a new one
      const newApplyData = new ApplyModel({
        itemId,
        category,
        clicks,
        lastClickedAt: Date.now(),
      });

      await newApplyData.save(); // Save the new record

      return res.status(201).json({
        message: "Apply created successfully",
        data: newApplyData,
      });
    }
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
      .populate("University Course")
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
