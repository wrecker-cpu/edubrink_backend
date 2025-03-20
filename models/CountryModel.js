const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of the Schema class

const countrySchema = new Schema({
  countryName: {
    en: { type: String, required: true, index: true }, // English name indexed
    ar: { type: String, required: true, index: true },
  },
  countrySummary: {
    en: { type: String }, // English overview
    ar: { type: String }, // Arabic overview
  },
  countryCurrency: { type: String, required: true },
  countryCode: {
    type: String,
    index: true,
  },
  countryLanguages: [
    {
      type: String,
    },
  ],
  countryPhotos: {
    mainPagePhoto: { type: String },
    countryFlag: { type: String },
  },
  countryOverview: {
    en: { type: String }, // English overview
    ar: { type: String }, // Arabic overview
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

  faculty: [
    {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      index: true, // Helps with population queries
    },
  ],
  universities: [
    {
      type: Schema.Types.ObjectId,
      ref: "University", // Reference to the University model
      index: true, // Helps with population queries
    },
  ],
  blog: [
    {
      type: Schema.Types.ObjectId,
      ref: "Blog",
      index: true, // Helps with population queries
    },
  ],
  faq: [
    {
      faqQuestions: { en: { type: String }, ar: { type: String } },
      faqAnswers: { en: { type: String }, ar: { type: String } },
    },
  ],
  hotDestination: { type: Boolean },
  livingCost: { type: String },
  customURLSlug: {
    en: { type: String },
    ar: { type: String },
  },
});

module.exports = mongoose.model("Country", countrySchema); // Exporting the model
