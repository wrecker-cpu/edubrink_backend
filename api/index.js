const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Require Routes
const userRoutes = require("../routes/UserRoutes");
const universityRoutes = require("../routes/UniversityRoutes");
const googleRoutes = require("../routes/GoogleRoutes");
const countryRoutes = require("../routes/CountryRoutes");
const courseRoutes = require("../routes/CourseRoutes");
const blogRoutes = require("../routes/BlogRoutes");
const analysisRoutes = require("../routes/AnalysisRoutes");
const applyRoutes = require("../routes/ApplyRoutes");
const facultyRoutes = require("../routes/FacultyRoutes");
const majorsRoutes = require("../routes/MajorsRoutes");

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Define API Endpoints with prefixes
app.use("/api/users", userRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/country", countryRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/apply", applyRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/majors", majorsRoutes);

// DATABASE CONNECTION
const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      await mongoose.connect(process.env.DB_URL);
      console.log("Connected to MongoDB");
      break; // Exit the loop on successful connection
    } catch (err) {
      console.error("Failed to connect to DB", err);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }

  if (retries === 0) {
    console.error("Could not connect to MongoDB after multiple attempts.");
    process.exit(1); // Exit process if connection fails
  }
};

connectDB();
// Export the Express app for Vercel serverless
module.exports = app;
