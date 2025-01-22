const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const courseSchema = new Schema({
  CourseName: { en: { type: String }, ar: { type: String } },
  CourseDescription: { en: { type: String }, ar: { type: String } },
  CourseDuration: { type: String },
  CourseStartDate: { type: Date },
  DeadLine: { type: Date },
  CourseFees: { type: String },
  ModeOfStudy: [{ en: { type: String }, ar: { type: String } }],
  Requirements: [{ en: { type: String }, ar: { type: String } }],
});

module.exports = mongoose.model("Course", courseSchema); //exporting the model
