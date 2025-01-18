const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const blogSchema = new Schema({
  blogTitle: { en: { type: String }, ar: { type: String } },
  blogSubtitle: { en: { type: String }, ar: { type: String } },
  blogDescription: { en: { type: String }, ar: { type: String } },
  blogAdded: { type: Date, default: Date.now },
  blogPhoto: { type: String },
  blogRelated: [{ en: { type: String }, ar: { type: String } }],
});

module.exports = mongoose.model("Blog", blogSchema); //exporting the model
