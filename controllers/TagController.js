const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600, checkperiod: 620 });
const TagModel = require("../models/TagModel");

const createTag = async (req, res) => {
  try {
    const TagData = new TagModel(req.body);
    await TagData.save();
    flushTagsCache();
    res.status(201).json({
      data: TagData,
      message: "Tag created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const flushTagsCache = () => cache.del("allTags");

const createBatchTags = async (req, res) => {
  try {
    const tags = req.body; // Expecting an array of tags

    if (!Array.isArray(tags) || tags.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid input, expected an array of tags." });
    }

    const insertedTags = await TagModel.insertMany(tags);

    res.status(201).json({
      data: insertedTags,
      message: "Tags created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTagById = async (req, res) => {
  const id = req.params.id;
  try {
    const TagData = await TagModel.findById(id).lean();
    if (!TagData) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.status(200).json({ data: TagData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllTag = async (req, res) => {
  try {
    const cacheKey = "allTags";
    const cachedTags = cache.get(cacheKey);

    if (cachedTags) {
      return res
        .status(200)
        .json({ data: cachedTags, message: "Tags fetched from cache" });
    }

    const tags = await TagModel.find().lean();
    cache.set(cacheKey, tags); // Store in cache

    res.status(200).json({ data: tags, message: "Tags fetched successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Tag by ID
const updateTag = async (req, res) => {
  const id = req.params.id;
  try {
    const TagData = await TagModel.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();
    if (!TagData) {
      return res.status(404).json({ message: "Tag not found" });
    }
    flushTagsCache();
    res.status(200).json({
      data: TagData,
      message: "Tag updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Tag by ID
const deleteTag = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedTag = await TagModel.findByIdAndDelete(id);
    if (!deletedTag) {
      return res.status(404).json({ message: "Tag not found" });
    }
    flushTagsCache();
    res.status(200).json({ message: "Tag deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTag,
  createBatchTags,
  getTagById,
  getAllTag,
  updateTag,
  deleteTag,
};
