const userModel = require("../models/UserModel");
const encrypt = require("../utils/Encrypt");
const auth = require("../auth/AuthValidation");
const bcrypt = require("bcrypt");
const userOTPVerification = require("../models/UserVerificationModel");
const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

// Create user
const createUser = async (req, res) => {
  try {
    const existingUser = await userModel.findOne({ Email: req.body.Email });

    if (existingUser) {
      // If the user already exists, send a response indicating the email is already registered
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }
    const user = {
      Email: req.body.Email,
      Password: encrypt.generatePassword(req.body.Password), // Ensure async if possible
      FullName: "",
      DateOfBirth: "",
      isAdmin: false,
      passwordChangedAt: Date.now(),
      status: true,
      verified: false,
    };

    // Create the user in the database
    const savedUser = await userModel.create(user);
    if (savedUser) {
      // Wait for OTP verification email to be sent before proceeding
      const otpStatus = await sendOtpVerificationEmail({
        id: savedUser._id,
        email: savedUser.Email,
      });

      if (otpStatus.status === "pending") {
        res.status(200).json({
          message: "User created successfully. OTP sent for verification.",
          data: otpStatus,
        });
      } else {
        // OTP email failed
        res.status(500).json({
          message: "User created, but failed to send OTP.",
          error: otpStatus.message,
        });
      }
    } else {
      res.status(400).json({ message: "Incomplete User Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const {
      Email,
      Password,
      FullName,
      DateOfBirth,
      isAdmin,
      Status,
      ActionStatus,
    } = req.body;

    // Check if the user already exists
    const existingUser = await userModel.findOne({ Email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Create user object
    const newUser = {
      Email,
      Password: encrypt.generatePassword(Password), // Hash the password
      FullName: FullName || "",
      DateOfBirth: DateOfBirth || "",
      isAdmin: isAdmin || false,
      passwordChangedAt: Date.now(),
      verified: true, // Admin-created users are verified by default
      Status: Status || false,
      ActionStatus,
    };

    // Save the user
    const savedUser = await userModel.create(newUser);

    return res.status(201).json({
      message: "User created successfully by admin",
      user: savedUser,
    });
  } catch (error) {
    console.error("Admin User Creation Error:", error);
    return res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
};

const getAllUserByAdmin = async (req, res) => {
  try {
    const user = await userModel.find().lean(); // Use .lean() for faster query
    res.status(200).json({ data: user, message: "Users fetched successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUserByAdmin = async (req, res) => {
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

const getUserAdminbyID = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await userModel.findById(id).lean();
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

const verifyOtp = async (req, res) => {
  try {
    let { userId, otp } = req.body;
    if (!userId || !otp) {
      throw new Error("Empty Fields");
    } else {
      const userOTPVerificationRecords = await userOTPVerification.find({
        userId,
      });
      if (userOTPVerificationRecords.length <= 0) {
        throw new Error("User OTP Verification Record Not Found");
      } else {
        const { expiresAt } = userOTPVerificationRecords[0];
        const hashedOTP = userOTPVerificationRecords[0].otp;
        if (expiresAt < Date.now()) {
          await userOTPVerification.deleteMany({ userId });
          throw new Error("OTP Expired");
        } else {
          const validOtp = await bcrypt.compare(otp, hashedOTP);
          if (!validOtp) {
            throw new Error("Invalid code passed. Check your inbox.");
          } else {
            await userModel.updateOne({ _id: userId }, { verified: true });
            await userOTPVerification.deleteMany({ userId });
            const verifiedUser = await userModel.findById(userId); // Await the result
            auth.createSendToken(verifiedUser, 200, res); // Send token if OTP is verified

            // Remove the redundant response here
            return; // Make sure nothing else is sent after this point
          }
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in verifying OTP",
      error: error.message,
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    let { userId, email } = req.body;
    if (!userId || !email) {
      throw Error("Empty Fields");
    } else {
      await userOTPVerification.deleteMany({ userId });
      sendOtpVerificationEmail({ id: userId, email: email }, res);
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in sending OTP",
      error: error.message,
    });
  }
};

const sendOtpVerificationEmail = async ({ id, email }) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // Mail Options to send OTP to the user's email
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "OTP Verification",
      html: `<p>Your OTP is <b>${otp}</b></p>`,
    };

    // Salt rounds for bcrypt hashing
    const saltRounds = 10;

    // Hash the OTP before saving it to the database
    const hashedOtp = await bcrypt.hash(otp, saltRounds);

    // Create a new OTP verification document
    const newOtpVerification = new userOTPVerification({
      userId: id,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // OTP expires in 5 minutes
    });

    // Save OTP verification in the database
    await newOtpVerification.save();

    // Send the OTP email
    await transporter.sendMail(mailOptions);

    // Return success status
    return {
      status: "pending",
      message: "OTP sent successfully. Awaiting verification.",
      data: { userId: id, email },
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
    };
  }
};

// Get all users
const getAllUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status, role } = req.query;

    // Parse query parameters
    const parsedPage = parseInt(page); // Default page is 1
    const parsedLimit = parseInt(limit); // Default limit is 10
    const skip = (parsedPage - 1) * parsedLimit; // Calculate the number of documents to skip

    // Build the query for filtering
    const query = {};
    if (search) {
      // Add search condition to the query
      query.$or = [
        { FullName: { $regex: search, $options: "i" } }, // Case-insensitive search on name
        { Email: { $regex: search, $options: "i" } }, // Case-insensitive search on email
        // Add more fields to search if needed
      ];
    }

    if (status) {
      query.Status = { $regex: `^${status}$`, $options: "i" }; // Case-insensitive match
    }

    if (role) {
      // Parse the `role` parameter into an array
      let rolesArray;
      try {
        rolesArray = JSON.parse(role); // Parse the URL-encoded array
      } catch (err) {
        rolesArray = [role]; // Fallback to a single role if parsing fails
      }

      // Add filter for `ActionStatus` using the parsed roles (case-sensitive)
      query.ActionStatus = { $in: rolesArray }; // Case-sensitive match
    }

    // Fetch users with pagination and filtering
    const users = await userModel
      .find(query)
      .skip(skip) // Skip documents for pagination
      .limit(parsedLimit) // Limit the number of documents
      .lean(); // Convert to plain JavaScript objects

    // Get the total count of users for pagination metadata (with the same filter)
    const totalCount = await userModel.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.status(200).json({
      data: users,
      pagination: {
        totalCount, // Total number of users
        totalPages, // Total number of pages
        currentPage: parsedPage, // Current page
        limit: parsedLimit, // Number of users per page
      },
      message: "Users fetched successfully",
    });
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
    const user = await userModel.findById(id).lean();
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
  const { Email, Password } = req.body;
  let user;

  try {
    user = await userModel.findOne({ Email: Email }).lean(); // Optimize query

    if (user) {
      const isPasswordValid = await encrypt.comparePassword(
        Password,
        user.Password
      );

      if (isPasswordValid) {
        if (!user.verified) {
          // Fix: Covers undefined, null, false, 0
          const otpStatus = await sendOtpVerificationEmail({
            id: user._id,
            email: user.Email,
          });

          if (otpStatus.status === "pending") {
            return res.status(200).json({
              message: "User created successfully. OTP sent for verification.",
              data: otpStatus,
            });
          } else {
            return res.status(500).json({
              message: "User created, but failed to send OTP.",
              error: otpStatus.message,
            });
          }
        }

        // User is verified, generate token
        auth.createSendToken(user, 200, res);
      } else {
        return res.status(400).json({ message: "Invalid password" });
      }
    } else {
      return res.status(404).json({ message: "Email Not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getAllUser,
  createUserByAdmin,
  getAllUserByAdmin,
  updateUserByAdmin,
  getUserAdminbyID,
  updateUser,
  updateAllUsers,
  getUserbyID,
  deleteUser,
  loginUser,
  verifyOtp,
  resendOtp,
};
