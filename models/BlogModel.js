const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const blogSchema = new Schema({
  blogTitle: { en: { type: String }, ar: { type: String } },
  blogSubtitle: { en: { type: String }, ar: { type: String } },
  blogAuthor: { type: String },
  blogCategory: { type: String },
  publishImmediately: { type: Boolean },
  featuredBlog: { type: Boolean },
  blogTags: { en: [{ type: String }], ar: [{ type: String }] },
  blogDescription: { en: { type: String }, ar: { type: String } },
  blogAdded: { type: Date, default: Date.now },
  blogPhoto: { type: String },
  blogCountry: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
  status: {
    type: String,
    enum: ["Draft", "Pending Review", "Published"],
    default: "Draft",
  }, // Article Status
  excerpt: { en: { type: String }, ar: { type: String } },
  scheduledPublishDate: { type: Date }, // Scheduling future publish dates
  allowComments: { type: Boolean, default: true }, // Enable/Disable comments
  visibility: {
    type: String,
    enum: ["Public", "Private", "Password Protected"],
    default: "Public",
  }, // Visibility Settings
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
  customURLSlug: {
    en: { type: String },
    ar: { type: String },
  },
});

module.exports = mongoose.model("Blog", blogSchema); //exporting the model
