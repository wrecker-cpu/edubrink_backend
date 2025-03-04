const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Creation of the Schema class

const universitySchema = new Schema({
  uniName: {
    en: { type: String, required: true }, // English name
    ar: { type: String, required: true }, // Arabic name
  },
  uniSymbol: { type: String },
  courseId: [
    {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
  faculty: [
    {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
    },
  ],
  uniMainImage: { type: String },
  scholarshipAvailability: {
    type: Boolean,
  },
  housing_available: { type: Boolean },
  living_cost: { type: String },
  admission_requirements: [{ type: String }],
  preparatory_year: { type: Boolean },
  preparatory_year_fees: { type: String },
  study_programs: [{ type: String }],
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
  studyLevel: [
    {
      type: String,
    },
  ],
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
  campuses: [
    {
      campusName: { en: { type: String }, ar: { type: String } },
      campusLocation: {
        uniAddress: { en: { type: String }, ar: { type: String } },
        uniPincode: { type: String },
        uniCity: { en: { type: String }, ar: { type: String } },
        uniState: { en: { type: String }, ar: { type: String } },
        uniCountry: { en: { type: String }, ar: { type: String } },
      },
      campusFacilities: [{ type: String }],
    },
  ],
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
  uniTutionFees: {
    type: Number,
  },
  uniCreationDate: {
    type: Date,
    default: Date.now,
  },
  uniStartDate: { type: String },
  uniDeadline: { type: String },
  uniDuration: { type: String },
  uniDiscount: {
    en: { type: String }, // English overview
    ar: { type: String }, // Arabic overview
  },
  uniOverview: {
    en: { type: String }, // English overview
    ar: { type: String }, // Arabic overview
  },
  uniAccomodation: {
    en: { type: String }, // English accommodation description
    ar: { type: String }, // Arabic accommodation description
  },
  uniFeatured: { type: Boolean },
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
