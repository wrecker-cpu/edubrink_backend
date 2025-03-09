const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const notificationSchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "category", // Dynamic reference
  },
  message: { en: { type: String }, ar: { type: String } },
  item: { en: { type: String }, ar: { type: String } },
  category: {
    type: String,
    required: true,
    enum: ["University", "Course", "Country", "Blog", "Major", "Faculty"],
  },

  mark: {
    type: String,
    default: "Not Read",
    enum: ["Read", "Not Read"],
  },
  notificationTime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema); //exporting the model
