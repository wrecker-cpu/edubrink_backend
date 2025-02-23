const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of schema class object

const facultySchema = new Schema({
  facultyName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  studyLevel: [{ type: String }],
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University", // Correct reference
  },
  facultyDescription: {
    en: { type: String },
    ar: { type: String },
  },
  facultyFeatured: {
    type: Boolean,
  },
});

module.exports = mongoose.model("Faculty", facultySchema); // Exporting the model
