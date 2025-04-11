const NodeCache = require("node-cache");
const blogModel = require("../models/BlogModel");
const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const facultyModel = require("../models/FacultyModel");
const majorModel = require("../models/MajorsModel");
const tagModel = require("../models/TagModel");

// Initialize cache with TTL (Time-To-Live) of 10 minutes
const cache = new NodeCache({ stdTTL: 600, checkperiod: 620 });

const getKeywords = async (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get("keywordsData");
    if (cachedData) {
      return res.status(200).json({
        data: cachedData,
        message: "Keywords fetched from cache",
      });
    }

    // Fetch data from MongoDB if not in cache
    const [blogs, countries, universities, courses, tags, majors] =
      await Promise.all([
        blogModel.find({}, "blogTitle customURLSlug").lean(),
        countryModel.find({}, "countryName customURLSlug").lean(),
        universityModel.find({}, "uniName customURLSlug").lean(),
        courseModel.find({}, "CourseName customURLSlug").lean(),
        tagModel.find({}, "tags").lean(),
        // facultyModel.find({}, "facultyName customURLSlug").lean(),
        majorModel.find({}, "_id majorName customURLSlug").lean(),
      ]);

    // Extract and group keywords with their respective customURLSlug
    const blogKeywords = blogs.map((blog) => ({
      keywords: [blog.blogTitle?.en, blog.blogTitle?.ar].filter(Boolean),
      customURLSlug: blog.customURLSlug, // Blog slug
    }));

    const countryKeywords = countries.map((country) => ({
      keywords: [country.countryName?.en, country.countryName?.ar].filter(
        Boolean
      ),
      customURLSlug: country.customURLSlug, // Country slug
    }));

    const universityKeywords = universities.map((uni) => ({
      keywords: [uni.uniName?.en, uni.uniName?.ar].filter(Boolean),
      customURLSlug: uni.customURLSlug, // University slug
    }));

    const courseKeywords = courses.map((course) => ({
      keywords: [course.CourseName?.en, course.CourseName?.ar].filter(Boolean),
      customURLSlug: course.customURLSlug, // Course slug
    }));
    // const facultyKeywords = faculties.map((faculty) => ({
    //   keywords: [faculty.facultyName?.en, faculty.facultyName?.ar].filter(
    //     Boolean
    //   ),
    //   customURLSlug: faculty.customURLSlug, // Course slug
    // }));

    const majorKeywords = majors.map((major) => ({
      keywords: [major.majorName?.en, major.majorName?.ar].filter(Boolean),
      customURLSlug: major.customURLSlug,
    }));

    const tagKeywords = tags.map((tag) => ({
      keywords: {
        en: tag.tags?.en || [],
        ar: tag.tags?.ar || [],
      },
    }));

    // Create response structure
    const data = [
      { type: "blog", data: blogKeywords },
      { type: "country", data: countryKeywords },
      { type: "university", data: universityKeywords },
      { type: "course", data: courseKeywords },
      { type: "tag", data: tagKeywords },
      { type: "major", data: majorKeywords },
    ];

    // Store data in cache
    cache.set("keywordsData", data);

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

const getKeywordForAdmin = async (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get("keywordsDataAdmin");
    if (cachedData) {
      return res.status(200).json({
        data: cachedData,
        message: "Keywords fetched from cache",
      });
    }

    // Fetch data from MongoDB if not in cache
    const [blogs, countries, universities, courses, majors] = await Promise.all(
      [
        blogModel.find({}, "_id blogTitle ").lean(),
        countryModel.find({}, "_id countryName ").lean(),
        universityModel.find({}, "_id uniName ").lean(),
        courseModel.find({}, "_id CourseName ").lean(),
        // facultyModel.find({}, "_id facultyName").lean(),
        majorModel.find({}, "_id majorName").lean(),
      ]
    );

    // Extract and group keywords with their respective customURLSlug
    const blogKeywords = blogs.map((blog) => ({
      keywords: [blog.blogTitle?.en, blog.blogTitle?.ar].filter(Boolean),
      _id: blog._id, // Blog slug
    }));

    const countryKeywords = countries.map((country) => ({
      keywords: [country.countryName?.en, country.countryName?.ar].filter(
        Boolean
      ),
      _id: country._id, // Blog slug
    }));

    const universityKeywords = universities.map((uni) => ({
      keywords: [uni.uniName?.en, uni.uniName?.ar].filter(Boolean),
      _id: uni._id, // Blog slug
    }));

    const courseKeywords = courses.map((course) => ({
      keywords: [course.CourseName?.en, course.CourseName?.ar].filter(Boolean),
      _id: course._id, // Blog slug
    }));

    const MajorKeywords = majors.map((major) => ({
      keywords: [major.majorName?.en, major.majorName?.ar].filter(Boolean),
      _id: major._id, // Blog slug
    }));
    // const facultyKeywords = faculties.map((faculty) => ({
    //   keywords: [faculty.facultyName?.en, faculty.facultyName?.ar].filter(
    //     Boolean
    //   ),
    //   _id: faculty._id, // Blog slug
    // }));

    // Create response structure
    const data = [
      { type: "blog", data: blogKeywords },
      { type: "country", data: countryKeywords },
      { type: "university", data: universityKeywords },
      { type: "course", data: courseKeywords },
      // { type: "faculty", data: facultyKeywords },
      { type: "major", data: MajorKeywords },
    ];

    // Store data in cache
    cache.set("keywordsDataAdmin", data);

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
  getKeywordForAdmin,
};
