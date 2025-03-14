const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ApplySchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "category",
  },
  category: {
    type: String,
    required: true,
    enum: ["University", "Course"],
  },
  userDetails: {
    personName: { type: String },
    personEmail: { type: String },
    personPhone: { type: String },
    personAddress: { type: String },
    personDOB: { type: Date },
  },
  education: {
    highestQualification: { type: String },
    institution: { type: String },
    graduationYear: { type: String },
    gpa: { type: String },
  },
  experience: {
    yearsOfExperience: { type: String },
    currentEmployer: { type: String },
    jobTitle: { type: String },
  },
  skills: {
    languages: { type: String },
    computerSkills: { type: String },
    certifications: { type: String },
  },
  preferences: {
    startDate: { type: Date },
    programType: { type: String },
  },
  userDescription: {
    type: String,
  },
  status: {
    type: String,
    default: "Pending",
  },
  appliedDate: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Apply", ApplySchema);