const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tagSchema = new Schema({
  tags: {
    en: [{ type: String, required: true }],
    ar: [{ type: String, required: true }],
  },
});

module.exports = mongoose.model("Tag", tagSchema);
