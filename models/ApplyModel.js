const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const ApplySchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "category", // Dynamic reference
  },
  category: {
    type: String,
    required: true,
    enum: ["University", "Course"],
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }
});

module.exports = mongoose.model("Apply", ApplySchema); //exporting the model
