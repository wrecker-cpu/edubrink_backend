const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const analysisSchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "category", // Mongoose dynamically links to University, Country, or analysis
  },
  category: {
    type: String,
    required: true,
    enum: ["University", "Country", "Blog", "Course"],
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
