const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const BlogModel = require("../models/BlogModel");

const getCountries = async (req, res) => {
  try {
    let filterProp = {};
    if (req.query.filterProp) {
      try {
        filterProp = JSON.parse(decodeURIComponent(req.query.filterProp));
      } catch (error) {
        console.error("Error parsing filterProp:", error.message);
      }
    }

    // ✅ If no Destination filter is provided, return all countries
    const countryFilter = filterProp.Destination?.length
      ? { "countryName.en": { $in: filterProp.Destination } }
      : {}; // Empty filter means fetch all

    const countries = await countryModel
      .find(countryFilter) // If empty, fetches all
      .select("_id countryName countryPhotos countryCode")
      .lean();

    res.status(200).json({ data: countries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUniversitiesByCountries = async (req, res) => {
  try {
    const countryIds = req.query.countryIds
      ? req.query.countryIds.split(",")
      : [];
    if (!countryIds.length)
      return res.status(400).json({ message: "No country IDs provided" });

    let universityFilter = { uniCountry: { $in: countryIds } };

    if (req.query.StudyLevel && req.query.StudyLevel !== "All") {
      universityFilter.studyLevel = { $in: [req.query.StudyLevel] };
    }
    if (req.query.EntranceExam) {
      universityFilter.entranceExamRequired = req.query.EntranceExam;
    }
    if (req.query.UniType) {
      universityFilter.uniType = req.query.UniType;
    }
    if (req.query.IntakeYear) {
      universityFilter.inTakeYear = req.query.IntakeYear;
    }
    if (req.query.IntakeMonth) {
      universityFilter.inTakeMonth = req.query.IntakeMonth;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const universities = await universityModel
      .find(universityFilter)
      .select(
        "_id uniCountry uniName uniType studyLevel uniTutionFees uniFeatured"
      )
      .populate("uniCountry", "countryName countryPhotos countryCode")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUniversities = await universityModel.countDocuments(
      universityFilter
    );
    res.status(200).json({
      data: universities,
      pagination: {
        page,
        limit,
        totalUniversities,
        hasMore: page * limit < totalUniversities,
        totalPages: Math.ceil(totalUniversities / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCoursesByUniversities = async (req, res) => {
    try {
  
      const universityIds = req.query.universityIds
        ? req.query.universityIds.split(",")
        : [];
      if (!universityIds.length)
        return res.status(400).json({ message: "No university IDs provided" });
  
      let courseFilter = { university: { $in: universityIds } };
  
      if (req.query.minBudget || req.query.maxBudget) {
        courseFilter.CourseFees = {
          $gte: Number(req.query.minBudget) || 0,
          $lte: Number(req.query.maxBudget) || Infinity,
        };
      }
  
      // Initialize $or filter array
      let orConditions = [];
  
      if (req.query.CourseDuration) {
        let [min, max] = req.query.CourseDuration.split("-").map(Number);
        if (max === undefined) max = Infinity;
        
        orConditions.push(
          { CourseDurationUnits: "Years", CourseDuration: { $gte: min / 12, $lte: max / 12 } },
          { CourseDurationUnits: "Months", CourseDuration: { $gte: min, $lte: max } },
          { CourseDurationUnits: "Weeks", CourseDuration: { $gte: min / 0.23, $lte: max / 0.23 } }
        );
      }
  
      if (req.query.ModeOfStudy) {
        courseFilter.$or = [
          { "ModeOfStudy.en": req.query.ModeOfStudy },
          { "ModeOfStudy.ar": req.query.ModeOfStudy }
        ];
      }
  
      if (req.query.searchQuery) {
        const searchQuery = JSON.parse(req.query.searchQuery);
        if (searchQuery.en || searchQuery.ar) {
          orConditions.push(
            searchQuery.en ? { "Tags.en": { $regex: searchQuery.en, $options: "i" } } : null,
            searchQuery.ar ? { "Tags.ar": { $regex: searchQuery.ar, $options: "i" } } : null
          );
        }
      }
  
      // Apply $or filter if it has conditions
      if (orConditions.length > 0) {
        courseFilter.$or = orConditions.filter(Boolean); // Remove null values
      }
  
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
  
      const courses = await courseModel
        .find(courseFilter)
        .select("CourseName CourseFees CourseDuration ModeOfStudy Tags university")
        .populate("university", "uniName uniType studyLevel uniTutionFees uniFeatured")
        .skip(skip)
        .limit(limit)
        .lean();
  
      const totalCourses = await courseModel.countDocuments(courseFilter);
      res.status(200).json({
        data: courses,
        pagination: {
          page,
          limit,
          totalCourses,
          hasMore: page * limit < totalCourses, // ✅ Check if there are more courses
          totalPages: Math.ceil(totalCourses / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

const getBlogsByCountries = async (req, res) => {
  try {
    const countryIds = req.query.countryIds
      ? req.query.countryIds.split(",")
      : [];
    if (!countryIds.length)
      return res.status(400).json({ message: "No country IDs provided" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await BlogModel.find({ blogCountry: { $in: countryIds } })
      .select("blogTitle blogSubtitle blogAdded blogPhoto blogCountry")
      .populate("blogCountry", "countryName countryPhotos countryCode")
      .limit(limit)
      .skip(skip)
      .lean();

    const totalBlogs = await BlogModel.countDocuments({
      blogCountry: { $in: countryIds },
    });

    res.status(200).json({
      data: blogs,
      pagination: {
        page,
        limit,
        totalBlogs,
        totalPages: Math.ceil(totalBlogs / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCountries,
  getBlogsByCountries,
  getUniversitiesByCountries,
  getCoursesByUniversities,
};
