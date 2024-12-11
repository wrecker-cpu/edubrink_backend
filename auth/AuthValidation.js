const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const userModel = require("../models/UserModel");
require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET || "default-secret";
const jwtExpires = process.env.JWT_EXPIRES;
const jwtCookieExpires = process.env.JWT_COOKIE_EXPIRES;
const nodeEnv = process.env.NODE_ENV;

const protect = async (req, res, next) => {
  try {
    // Getting the token if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ message: "Please login to get access." });
    }

    // Verifying the token
    const decode = await promisify(jwt.verify)(token, jwtSecret);
    console.log(decode);

    // Find the user based on the decoded ID
    const freshUser = await userModel.findById(decode.id);
    if (!freshUser) {
      return res.status(401).json({
        message: "The user belonging to this token does not exist.",
      });
    }

    // Optional: Check if the user has changed their password recently
    if (freshUser.changedPassword(decode.iat)) {
      return res.status(401).json({
        message:
          "The user recently changed their password; please log in again.",
      });
    }

    // If all guard clauses pass
    req.user = freshUser;
    res.locals.user = freshUser; // Set user in response locals
    next(); // Call the next middleware or route handler
  } catch (err) {
    return res.status(401).json({
      message: "Protection middleware blocked access.",
      error: err.message,
      stack: err.stack,
    });
  }
};

const restrictToAdmin = (req, res, next) => {
  // Check if the user is an admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(401).json({
      message: "You do not have the permissions to perform this action",
    });
  }

  next(); // If the user is an admin, proceed to the next middleware or route handler
};

function signToken(id,isAdmin) {
  return jwt.sign({ id, isAdmin }, jwtSecret || "default-secret", {
    expiresIn: jwtExpires || "1h",
  });
}

function createSendToken(user, statusCode, res) {
  const token = signToken(user._id, user.isAdmin);

  const cookieOptions = {
    expiresIn: jwtCookieExpires,
    httpOnly: true,
  };
  if (nodeEnv === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    message: "Token Sent Via Cookie and Response",
    token,
    data: {
      user,
    },
  });
}

module.exports = {
  protect,
  restrictToAdmin,
  createSendToken,
};
