const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of the Schema class

const countrySchema = new Schema({
  countryName: {
    en: { type: String, required: true, index: true }, // English name indexed
    ar: { type: String, required: true, index: true },
  },
  countryStudentPopulation: { type: Number, required: true },
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
});

module.exports = mongoose.model("Country", countrySchema); // Exporting the model
