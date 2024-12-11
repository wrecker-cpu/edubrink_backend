const userModel = require("../models/UserModel");
const encrypt = require("../utils/Encrypt");
const auth = require("../auth/AuthValidation");
require("dotenv").config();

// Create user
const createUser = async (req, res) => {
  try {
    const user = {
      Email: req.body.Email,
      Password: encrypt.generatePassword(req.body.Password), // Ensure async if possible
      MobileNumber: req.body.MobileNumber,
      Coupons: ["67497c0f3600417c0e450d7d"],
      FullName: "",
      DateOfBirth: "",
      status: req.body.status,
      isAdmin: "false",
      passwordChangedAt: Date.now(),
    };

    const savedUser = await userModel.create(user);
    if (savedUser) {
      auth.createSendToken(savedUser, 201, res);
    } else {
      res.status(400).json({ message: "Incomplete User Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

// Get all users
const getAllUser = async (req, res) => {
  try {
    const user = await userModel.find({ status: true }).lean(); // Use .lean() for faster query
    res.status(200).json({ data: user, message: "Users fetched successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAllUsers = async (req, res) => {
  try {
    const updateData = req.body;
    const result = await userModel.updateMany({}, updateData);

    res.status(200).json({
      message: "Users updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating users", error: error.message });
  }
};

// Get user by ID
const getUserbyID = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await userModel
      .findById(id)
      .lean()
      .populate("WishListCountries WishListStates Coupons"); // Use .lean() for faster query
    if (user) {
      res
        .status(200)
        .json({ message: "User fetched successfully", data: user });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error });
  }
};

// Update user
const updateUser = async (req, res) => {
  const id = req.params.id;
  try {
    const userData = await userModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean(); // Use .lean()
    res
      .status(200)
      .json({ data: userData, message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await userModel.findByIdAndDelete(id).lean(); // Use .lean()
    if (user) {
      res.status(200).json({ data: user, message: "Deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// User login
const loginUser = async (req, res) => {
  const { Email, Password, MobileNumber } = req.body;
  let user;

  try {
    // Single query with $or for Email and MobileNumber to avoid multiple MongoDB calls
    user = await userModel
      .findOne({ $or: [{ Email: Email }, { MobileNumber: MobileNumber }] })
      .lean(); // Use .lean() to improve query performance

    if (user) {
      const isPasswordValid = await encrypt.comparePassword(
        Password,
        user.Password
      );
      if (isPasswordValid) {
        auth.createSendToken(user, 200, res); // Send token if password matches
      } else {
        res.status(400).json({ message: "Invalid password" });
      }
    } else {
      res.status(404).json({ message: "Email or Mobile Number not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getAllUser,
  updateUser,
  updateAllUsers,
  getUserbyID,
  deleteUser,
  loginUser,
};
