const express = require("express");
const { googleLogin } = require("../controllers/GoogleController"); // adjust path if necessary

const router = express.Router();

// Define the Google login route
router.get("/auth/google", googleLogin);

module.exports = router;
