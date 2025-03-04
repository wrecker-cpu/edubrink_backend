const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const courseSchema = new Schema({
  CourseName: { en: { type: String }, ar: { type: String } },
  CourseDescription: { en: { type: String }, ar: { type: String } },
  CourseDuration: { type: String },
  CourseStartDate: { type: Date },
  CourseType: { type: String },
  Languages: [{ type: String }],
  StudyLevel: [{ type: String }],
  DeadLine: { type: Date },
  CourseFees: { type: Number },
  ModeOfStudy: { en: [{ type: String }], ar: [{ type: String }] },
  Requirements: { en: [{ type: String }], ar: [{ type: String }] },
  Tags: { en: [{ type: String }], ar: [{ type: String }] },
  scholarshipsAvailable: { type: Boolean },
  scholarshipType: {
    type: String,
    enum: ["none", "partial", "full"],
    default: "none",
  },
  scholarshipPercentage: { type: String },
  DiscountAvailable: { type: Boolean },
  DiscountValue: { type: String },
  MostPopular: { type: Boolean },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
  },
  CourseCategory: {
    type: String,
    required: true,
  },
  provider: { type: String },
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

module.exports = mongoose.model("Course", courseSchema); //exporting the model
