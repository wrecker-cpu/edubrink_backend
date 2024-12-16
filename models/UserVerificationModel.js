const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const userOTPVerificationSchema=new Schema({
    userId:{type:Schema.Types.ObjectId,ref:"User"},
    otp:String,
    createdAt: Date,
    expiresAt: Date,
})

module.exports = mongoose.model("userOTPVerification", userOTPVerificationSchema);