const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of schema class object

const majorSchema = new Schema({
  majorName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University", // Dynamic reference
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
  faq: [
    {
      faqQuestions: { en: { type: String }, ar: { type: String } },
      faqAnswers: { en: { type: String }, ar: { type: String } },
    },
  ],
  customURLSlug: {
    en: { type: String },
    ar: { type: String },
  },

  seo: {
    metaTitle: {
      en: { type: String, index: true },
      ar: { type: String, index: true },
    },
    metaDescription: {
      en: { type: String },
      ar: { type: String },
    },
    metaKeywords: {
      en: [{ type: String }], // Array of SEO Keywords in English
      ar: [{ type: String }], // Array of SEO Keywords in Arabic
    },
  },
});

module.exports = mongoose.model("Major", majorSchema); // Exporting the model
