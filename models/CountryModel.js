const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of the Schema class

const countrySchema = new Schema({
  countryName: {
    en: { type: String, required: true }, // English name
    ar: { type: String, required: true }, // Arabic name
  },

  countryStudentPopulation: { type: Number, required: true }, // Population
  countryCurrency: { type: String, required: true }, // Currency
  countryCode: { type: String },
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
    },
  ],
  universities: [
    {
      type: Schema.Types.ObjectId,
      ref: "University", // Reference to the University model
    },
  ],
  blog: [
    {
      type: Schema.Types.ObjectId,
      ref: "Blog",
    },
  ],
});

module.exports = mongoose.model("Country", countrySchema); // Exporting the model
