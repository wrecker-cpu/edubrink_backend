const NodeCache = require("node-cache");
const analysisModel = require("../models/AnalysisModel");
const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

// Create a new analysis
const createAnalysis = async (req, res) => {
  try {
    const { itemId, category, clicks } = req.body;

    // Validate if category is valid
    const allowedCategories = ["University", "Country", "Blog", "Course"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Check if the analysis data for the itemId and category already exists
    const existingAnalysis = await analysisModel.findOne({ itemId, category });

    if (existingAnalysis) {
      // If the record exists, increment the clicks and update the last clicked time
      existingAnalysis.clicks += clicks;
      existingAnalysis.lastClickedAt = Date.now();

      await existingAnalysis.save(); // Save the updated record

      return res.status(200).json({
        message: "Analysis updated successfully",
        data: existingAnalysis,
      });
    } else {
      // If the record does not exist, create a new one
      const newAnalysisData = new analysisModel({
        itemId,
        category,
        clicks,
        lastClickedAt: Date.now(),
      });

      await newAnalysisData.save(); // Save the new record

      return res.status(201).json({
        message: "Analysis created successfully",
        data: newAnalysisData,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createAnalysisBatch = async (req, res) => {
  try {
    const batchData = req.body;

    if (!Array.isArray(batchData)) {
      return res
        .status(400)
        .json({ message: "Invalid data format. Expected an array." });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    for (let data of batchData) {
      const { itemId, category, clicks, country } = data;

      const allowedCategories = ["University", "Country", "Blog", "Course"];
      if (!allowedCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const existingAnalysis = await analysisModel.findOne({
        itemId,
        category,
      });

      if (existingAnalysis) {
        // ✅ **Preserve previous clickHistory instead of overwriting**
        let updatedClickHistory = [...existingAnalysis.clickHistory];

        // Find today's entry
        let todayEntry = updatedClickHistory.find(
          (entry) => entry.date === today
        );

        if (todayEntry) {
          todayEntry.clicks += clicks; // Increment today's clicks
        } else {
          updatedClickHistory.push({ date: today, clicks }); // Add new entry for today
        }

        // ✅ **Fix: Ensure click history is sorted by date**
        updatedClickHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        // ✅ **Fix: Update total clicks**
        existingAnalysis.clickHistory = updatedClickHistory;
        existingAnalysis.clicks = updatedClickHistory.reduce(
          (sum, entry) => sum + entry.clicks,
          0
        );
        existingAnalysis.lastClickedAt = new Date();

        await existingAnalysis.save();
      } else {
        // If no previous record exists, create a new entry
        const newAnalysisData = new analysisModel({
          itemId,
          category,
          clickHistory: [{ date: today, clicks }],
          clicks, // ✅ **Set initial total clicks correctly**
          lastClickedAt: new Date(),
          country: category === "Country" ? undefined : country,
        });

        await newAnalysisData.save();
      }
    }

    return res
      .status(200)
      .json({ message: "Batch analysis updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a analysis by ID
const getAnalysisById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the analysis and populate the 'universities' field
    const analysisData = await analysisModel
      .findById(id)
      .populate("universities blog")
      .lean();
    if (!analysisData) {
      return res.status(404).json({ message: "analysis not found" });
    }
    res.status(200).json({ data: analysisData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllAnalysis = async (req, res) => {
  try {
    const analysis = await analysisModel
      .find()
      .populate({
        path: "itemId",
        select: "CourseName uniName blogTitle countryName",
      })
      .lean();

    res.status(200).json({ data: analysis });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a analysis by ID
const updateAnalysis = async (req, res) => {
  const id = req.params.id;
  try {
    const analysisData = await analysisModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!analysisData) {
      return res.status(404).json({ message: "analysis not found" });
    }
    res
      .status(200)
      .json({ data: analysisData, message: "analysis updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a analysis by ID
const deleteAnalysis = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedanalysis = await analysisModel.findByIdAndDelete(id);
    if (!deletedanalysis) {
      return res.status(404).json({ message: "analysis not found" });
    }
    res.status(200).json({ message: "analysis deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createAnalysis,
  createAnalysisBatch,
  getAnalysisById,
  getAllAnalysis,
  updateAnalysis,
  deleteAnalysis,
};
