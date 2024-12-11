const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class

const userSchema = new Schema({
  Email: { type: String },
  Password: { type: String },
  MobileNumber: { type: String },
  FullName: { type: String },
  DateOfBirth: { type: Date },
  status: {
    type: Boolean,
    default: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  Address: { type: String },
  Coupons: [{ type: Schema.Types.ObjectId, ref: 'Coupon' }],
  MaritalStatus: { type: String, enum: ["Married", "Not-Married"] },
  Gender: { type: String, enum: ["Male", "Female", "Non-Binary"] },
  PinCode: { type: String },
  WishListCountries: [{ type: Schema.Types.ObjectId, ref: "Country" }],
  WishListStates: [{ type: Schema.Types.ObjectId, ref: "State" }],
  ExtraTravellers: [
    {
      TravellersName: { type: String },
      TravellersEmail: { type: String },
      TravellersAge: { type: String },
      TravellersNumber: { type: String },
      TravellersDateOfBirth: { type: Date },
      TravellersPassportNumber: { type: String },
      TravellersPassportIssuedCountry: { type: String },
      TravellersPassportDateOfExpiry: { type: String },
    },
  ],
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
