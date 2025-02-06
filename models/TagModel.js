const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tagSchema = new Schema({
  TagName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  keywords: {
    en: [{ type: String, required: true }],
    ar: [{ type: String, required: true }],
  },
});

module.exports = mongoose.model("Tag", tagSchema);
