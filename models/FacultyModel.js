const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of schema class object

const facultySchema = new Schema({
  facultyName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  studyLevel: [{ type: String }],
  major: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major", // Correct reference
    },
  ],
  universities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University", // New field to store the university reference
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  facultyDescription: {
    en: { type: String },
    ar: { type: String },
  },
  facultyFeatured: {
    type: Boolean,
  },
  customURLSlug: {
    en: { type: String },
    ar: { type: String },
  },
});

module.exports = mongoose.model("Faculty", facultySchema); // Exporting the model
