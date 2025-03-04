const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const userSchema = new Schema({
  Email: { type: String },
  Password: { type: String },
  MobileNumber: { type: String },
  FullName: { type: String },
  DateOfBirth: { type: Date },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  verified: { type: Boolean },
  Status: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  Address: { type: String },
  MaritalStatus: { type: String, enum: ["Married", "Not-Married"] },
  Gender: { type: String, enum: ["Male", "Female", "Non-Binary"] },
  // ProfilePicture: { type: String },
});
userSchema.methods.changedPassword = function (jwtIat) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimeStamp > jwtIat;
  }
  return false; // If no timestamp exists, assume password hasn't changed
};

module.exports = mongoose.model("User", userSchema); //exporting the model
