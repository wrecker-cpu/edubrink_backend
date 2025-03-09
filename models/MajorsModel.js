const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of schema class object

const majorSchema = new Schema({
  majorName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty", // Dynamic reference
  },
  modeOfStudy: { type: String },
  duration: {
    type: Number,
  },
  durationUnits: {
    type: String,
  },
  majorIntakeYear: {
    type: Number,
  },
  majorTuitionFees: {
    type: String,
  },
  studyLevel: [{ type: String }],
  majorLanguages: [{ type: String }],
  majorAdmissionRequirement: [{ type: String }],
  majorIntakeMonth: [{ type: String }],
  majorDescription: {
    en: { type: String },
    ar: { type: String },
  },
  majorCheckBox: {
    scholarshipsAvailable: { type: Boolean },
    expressAdmission: { type: Boolean },
    entranceExamRequired: { type: Boolean },
    featuredMajor: { type: Boolean },
  },
  
});

module.exports = mongoose.model("Major", majorSchema); // Exporting the model
