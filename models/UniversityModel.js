const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of the Schema class

const universitySchema = new Schema({
  uniName: {
    en: { type: String, required: true }, // English name
    ar: { type: String, required: true }, // Arabic name
  },
  uniSymbol: { type: String, required: true },
  courseId: [
    {
      type: Schema.Types.ObjectId,
      ref: "Course", // Reference to the Course model
    },
  ],
  scholarshipAvailability: {
    type: Boolean,
  },
  spokenLanguage: [
    {
      type: String,
    },
  ],
  uniType: {
    type: String,
    enum: ["public", "private"],
  },
  inTakeMonth: {
    type: String,
  },
  inTakeYear: {
    type: Number,
  },
  entranceExamRequired: {
    type: Boolean,
  },
  studyLevel: {
    type: String,
    enum: ["UnderGraduate", "PostGraduate", "Foundation", "Doctorate"],
  },
  uniLocation: {
    uniAddress: {
      en: { type: String, required: true }, // English address
      ar: { type: String, required: true }, // Arabic address
    },
    uniPincode: { type: String, required: true },
    uniCity: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    uniState: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    uniCountry: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
  },
  uniTutionFees: {
    type: Number,
  },
  uniOverview: {
    en: { type: String }, // English overview
    ar: { type: String }, // Arabic overview
  },
  uniAccomodation: {
    en: { type: String }, // English accommodation description
    ar: { type: String }, // Arabic accommodation description
  },
  uniLibrary: {
    libraryPhotos: [{ type: String }],
    libraryDescription: {
      en: { type: String },
      ar: { type: String },
    },
  },
  uniSports: {
    sportsPhotos: [{ type: String }],
    sportsDescription: {
      en: { type: String },
      ar: { type: String },
    },
  },
  studentLifeStyleInUni: {
    lifestylePhotos: [{ type: String }],
    lifestyleDescription: {
      en: { type: String },
      ar: { type: String },
    },
  },
});

module.exports = mongoose.model("University", universitySchema); // Exporting the model
