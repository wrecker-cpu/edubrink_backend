const NodeCache = require("node-cache");
const TagModel = require("../models/TagModel");
const CourseModel = require("../models/CourseModel");
const FacultyModel = require("../models/FacultyModel");
const BlogModel = require("../models/BlogModel");
const MajorsModel = require("../models/MajorsModel");
const UniversityModel = require("../models/UniversityModel");
const CountryModel = require("../models/CountryModel");

// Initialize cache (TTL: 10 minutes)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 620 });

const getAllDropdownData = async (req, res) => {
  try {
    // Check if data exists in cache
    const cachedData = cache.get("dropdownData");
    if (cachedData) {
      return res.status(200).json({
        data: cachedData,
        message: "Dropdown data fetched from cache",
      });
    }

    // Fetch data if not in cache
    const [tags, courses, faculties, blogs, majors, universities,countries] =
      await Promise.all([
        TagModel.find().select("_id tags").lean(),
        CourseModel.find().select("_id CourseName").lean(),
        FacultyModel.find().select("_id facultyName").lean(),
        BlogModel.find().select("_id blogTitle").lean(),
        MajorsModel.find().select("_id majorName").lean(),
        UniversityModel.find().select("_id uniName").lean(),
        CountryModel.find().select("_id countryName").lean(),
      ]);

    const dropdownData = {
      tags,
      courses,
      faculties,
      blogs,
      majors,
      universities,
      countries,
    };

    cache.set("dropdownData", dropdownData);

    res.status(200).json({
      data: dropdownData,
      message: "Dropdown data fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllDropdownData };
