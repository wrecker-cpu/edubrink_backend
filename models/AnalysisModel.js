const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const analysisSchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "category", // Dynamic reference
  },
  category: {
    type: String,
    required: true,
    enum: ["University", "Country", "Blog", "Course"],
  },
  country: {
    en: { type: String },
    ar: { type: String },
  },
  clicks: {
    type: Number,
    default: 0,
  },
  lastClickedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Analysis", analysisSchema); //exporting the model
