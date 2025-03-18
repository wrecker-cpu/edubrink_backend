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

  major: [
    {
      type: Schema.Types.ObjectId,
      ref: "Major",
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

  uniCountry: {
    type: Schema.Types.ObjectId,
    ref: "Country",
  },
  campuses: [
    {
      campusName: { en: { type: String }, ar: { type: String } },
      campusLocation: {
        uniCity: { en: { type: String }, ar: { type: String } },
        uniDescription: { en: { type: String }, ar: { type: String } },
      },
      campusFacilities: [{ type: String }],
    },
  ],
  faq: [
    {
      faqQuestions: { en: { type: String }, ar: { type: String } },
      faqAnswers: { en: { type: String }, ar: { type: String } },
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
  customURLSlug: {
    en: { type: String },
    ar: { type: String },
  },
});

module.exports = mongoose.model("University", universitySchema); // Exporting the model
