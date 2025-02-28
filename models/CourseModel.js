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
  Tags: {en: [{ type: String }], ar: [{ type: String }]},
  scholarshipsAvailable: { type: Boolean },
  DiscountAvailable: { type: Boolean },
  MostPopular: { type: Boolean },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University", 
  },
});

module.exports = mongoose.model("Course", courseSchema); //exporting the model
