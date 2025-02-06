const blogModel = require("../models/BlogModel");
const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const tagModel = require("../models/TagModel");

const getKeywords = async (req, res) => {
  try {
    // Fetch data from all models
    const blogs = await blogModel.find({}, "blogTitle");
    const countries = await countryModel.find({}, "countryName");
    const universities = await universityModel.find({}, "uniName");
    const courses = await courseModel.find({}, "CourseName");
    const tags = await tagModel.find({}, "TagName keywords");

    // Extract and group keywords
    const blogKeywords = blogs
      .flatMap((blog) => [blog.blogTitle?.en, blog.blogTitle?.ar])
      .filter(Boolean);

    const countryKeywords = countries
      .flatMap((country) => [country.countryName?.en, country.countryName?.ar])
      .filter(Boolean);

    const universityKeywords = universities
      .flatMap((uni) => [uni.uniName?.en, uni.uniName?.ar])
      .filter(Boolean);

    const courseKeywords = courses
      .flatMap((course) => [course.CourseName?.en, course.CourseName?.ar])
      .filter(Boolean);

    const tagKeywords = tags
      .map((tag) => ({
        TagName: tag.TagName,
        keywords: [...tag.keywords.en, ...tag.keywords.ar], // Flatten keywords from both languages
      }))
      .filter((tag) => tag.keywords.length > 0);

    // Create response structure
    const data = [
      { type: "blog", keywords: blogKeywords },
      { type: "country", keywords: countryKeywords },
      { type: "university", keywords: universityKeywords },
      { type: "course", keywords: courseKeywords },
      { type: "tag", data: tagKeywords },
    ];

    // Send response
    res.status(200).json({
      data: data,
      message: "Keywords fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching keywords:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getKeywords,
};
