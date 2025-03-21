const zlib = require("zlib");
const { Readable } = require("stream");
const NodeCache = require("node-cache");
const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const BlogModel = require("../models/BlogModel");
const { createNotification } = require("../controllers/HelperController");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 }); // 5 min TTL

const clearCountryCache = () => {
  const keys = cache.keys(); // Get all cached keys
  keys.forEach((key) => {
    if (key.startsWith("countries_")) {
      cache.del(key); // Delete only country-related caches
    }
  });
};

// Create a new country
const createCountry = async (req, res) => {
  try {
    const countryData = new countryModel(req.body);
    await countryData.save();
    await createNotification("Country", countryData, "countryName", "created");

    clearCountryCache();
    res
      .status(201)
      .json({ data: countryData, message: "Country created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a country by ID
const getCountryById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the country and populate the 'universities' field
    const countryData = await countryModel
      .findById(id)
      .populate("universities blog faculty")
      .lean();
    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ data: countryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await countryModel
      .find()
      .populate({
        path: "universities",
        select: "courseId uniName scholarshipAvailability uniTutionFees",
        populate: {
          path: "courseId",
          model: "Course",
          match: { _id: { $ne: null } }, // Ensures only non-null IDs are used
          select: "CourseName DeadLine CourseFees", // Include only specific fields
        },
      })
      .populate({
        path: "blog",
        select: "blogTitle blogSubtitle blogAdded",
      })
      .lean();
    res.status(200).json({ data: countries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCountriesByQuery = async (req, res) => {
  try {
    const { fields, populate } = req.query;

    // Generate cache key
    const cacheKey = `countries_${fields || "all"}_${populate || "none"}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ data: cachedData, cached: true });
    }

    // Query database
    const selectedFields = fields ? fields.split(",").join(" ") : "";
    let query = countryModel.find().select(selectedFields);

    if (populate) {
      const populateFields = populate.split(",");

      if (populateFields.includes("universities")) {
        query = query.populate({
          path: "universities",
          select: "courseId uniName scholarshipAvailability uniTutionFees",
          populate: {
            path: "courseId",
            model: "Course",
            match: { _id: { $ne: null } },
            select: "CourseName DeadLine CourseFees",
          },
        });
      }

      if (populateFields.includes("blog")) {
        query = query.populate({
          path: "blog",
          select: "blogTitle blogSubtitle blogAdded",
        });
      }
    }

    const countries = await query.lean();

    // Store in cache
    cache.set(cacheKey, countries, 300);

    res.status(200).json({ data: countries, cached: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCountryByName = async (req, res) => {
  const name = req.params.name;
  try {
    // Find the country by name
    const countryData = await countryModel
      .findOne({
        $or: [
          { "customURLSlug.en": name },
          { "customURLSlug.ar": name },
          { "countryName.en": name },
          { "countryName.ar": name },
        ],
      })
      .populate({
        path: "universities",
        select:
          "courseId uniName customURLSlug scholarshipAvailability uniTutionFees",
        options: { limit: 5 }, // Limit universities to 5
        populate: {
          path: "courseId",
          model: "Course",
          match: { _id: { $ne: null } }, // Ensure only non-null IDs are used
          select: "CourseName DeadLine customURLSlug CourseFees",
          options: { limit: 3 }, // Limit courses to 3 per university
        },
      })
      .populate({
        path: "blog",
        select: "blogTitle customURLSlug blogSubtitle blogAdded",
        options: { limit: 3 }, // Limit blogs to 3
      })
      .lean();

    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ data: countryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFullDepthData = async (req, res) => {
  try {
    const result = await countryModel.aggregate([
      {
        $lookup: {
          from: "universities",
          localField: "universities",
          foreignField: "_id",
          as: "universities",
        },
      },
      {
        $unwind: {
          path: "$universities",
          preserveNullAndEmptyArrays: true, // Preserve countries without universities
        },
      },
      {
        $lookup: {
          from: "courses", // Lookup courses based on IDs in the courseId array
          localField: "universities.courseId",
          foreignField: "_id",
          as: "universities.courses",
          pipeline: [
            {
              $project: {
                CourseName: 1,
                CourseDescription: 1,
                CourseDuration: 1,
                CourseStartDate: 1,
                DeadLine: 1,
                CourseFees: 1,
                ModeOfStudy: 1,
                Requirements: 1,
                Tags: 1, // Include Tags field from the tags lookup
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$_id", // Group back by country
          countryName: { $first: "$countryName" },
          countryPhotos: { $first: "$countryPhotos" },
          countryCode: { $first: "$countryCode" },
          countryStudentPopulation: { $first: "$countryStudentPopulation" },
          countryCurrency: { $first: "$countryCurrency" },
          countryLanguages: { $first: "$countryLanguages" },
          universities: { $push: "$universities" }, // Recreate the universities array
          blog: { $first: "$blog" }, // Include blog field for lookup
        },
      },
      {
        $lookup: {
          from: "blogs", // Populate blogs using the blogs IDs
          localField: "blog", // Local field in the country collection
          foreignField: "_id", // Match with the _id in blogs collection
          as: "blog", // Populate blog field
        },
      },
      {
        $addFields: {
          universities: {
            $map: {
              input: "$universities",
              as: "university",
              in: {
                $mergeObjects: [
                  "$$university",
                  {
                    countryName: "$countryName",
                    countryPhotos: "$countryPhotos",
                    countryCode: "$countryCode",
                  },
                ],
              },
            },
          },
          blog: {
            $map: {
              input: "$blog",
              as: "blogItem",
              in: {
                $mergeObjects: [
                  "$$blogItem",
                  {
                    countryName: "$countryName",
                    countryPhotos: "$countryPhotos",
                    countryCode: "$countryCode",
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          countryName: 1,
          countryCode: 1,
          countryPhotos: 1,
          countryStudentPopulation: 1,
          countryCurrency: 1,
          countryLanguages: 1,
          universities: 1,
          blog: 1, // Fully populated blog
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const responseData = JSON.stringify({
      data: result,
    });

    // Select the best compression algorithm based on client request
    const acceptEncoding = req.headers["accept-encoding"] || "";
    res.setHeader("Content-Type", "application/json");

    if (acceptEncoding.includes("br")) {
      res.setHeader("Content-Encoding", "br");
      Readable.from(responseData).pipe(zlib.createBrotliCompress()).pipe(res);
    } else if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
      Readable.from(responseData).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.send(responseData); // Send without compression if client doesn't support Brotli or Gzip
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFullDepthDataByFilter = async (req, res) => {
  try {
    let filterProp = {};

    // Parse filterProp from query
    if (req.query.filterProp) {
      try {
        const decodedFilter = decodeURIComponent(req.query.filterProp);
        filterProp = JSON.parse(decodedFilter);
      } catch (error) {
        console.error("Error parsing filterProp:", error.message);
      }
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1; // Default 5 per load
    const skip = (page - 1) * limit;

    // Additional pagination for Load More functionality
    const universityPage = parseInt(req.query.universityPage) || 1;
    const coursePage = parseInt(req.query.coursePage) || 1;
    const blogPage = parseInt(req.query.blogPage) || 1;

    const universitySkip = (universityPage - 1) * limit;
    const courseSkip = (coursePage - 1) * limit;
    const blogSkip = (blogPage - 1) * limit;

    // Step 1: Fetch Limited Countries
    const countryFilter = filterProp.Destination
      ? { "countryName.en": { $in: filterProp.Destination } }
      : {};

    const countries = await countryModel
      .find(countryFilter)
      .select("_id countryName countryPhotos countryCode")
      .lean();

    const countryIds = countries.map((c) => c._id);
    const blogs = await BlogModel.find({ blogCountry: { $in: countryIds } })
      .select("blogTitle blogSubtitle blogPhoto blogCountry")
      .limit(limit)
      .skip(blogSkip)
      .lean(); // Ensure lean() for performance

    // Create a mapping of countryId -> blogs
    const blogMap = blogs.reduce((acc, blog) => {
      const countryId = blog.blogCountry.toString();
      if (!acc[countryId]) acc[countryId] = [];
      acc[countryId].push(blog);
      return acc;
    }, {});

    if (!countries.length) {
      return res.status(404).json({ message: "No countries found" });
    }

    // Step 2: Fetch Paginated Universities
    const universityFilter = { uniCountry: { $in: countryIds } };
    if (filterProp.StudyLevel && filterProp.StudyLevel !== "All") {
      universityFilter.studyLevel = { $in: [filterProp.StudyLevel] };
    }
    if (filterProp.EntranceExam) {
      universityFilter.entranceExamRequired = filterProp.EntranceExam;
    }
    if (filterProp.UniType) {
      universityFilter.uniType = filterProp.UniType;
    }
    if (filterProp.IntakeYear) {
      universityFilter.inTakeYear = filterProp.IntakeYear;
    }
    if (filterProp.IntakeMonth) {
      universityFilter.inTakeMonth = filterProp.IntakeMonth;
    }

    const universities = await universityModel
      .find(
        universityFilter,
        "_id uniCountry uniName uniType studyLevel uniTutionFees uniFeatured uniDiscount entranceExamRequired scholarshipAvailability inTakeMonth inTakeYear"
      )
      .skip(universitySkip)
      .limit(limit)
      .lean();

    const universityIds = universities.map((u) => u._id);

    // Step 3: Fetch Paginated Courses
    const courseFilter = { university: { $in: universityIds } };
    if (filterProp.minBudget || filterProp.maxBudget) {
      courseFilter.CourseFees = {
        $gte: Number(filterProp.minBudget) || 0,
        $lte: Number(filterProp.maxBudget) || Infinity,
      };
    }
    if (filterProp.ModeOfStudy) {
      courseFilter["ModeOfStudy.en"] = { $in: [filterProp.ModeOfStudy] };
      courseFilter["ModeOfStudy.ar"] = { $in: [filterProp.ModeOfStudy] };
    }

    if (filterProp.searchQuery?.en || filterProp.searchQuery?.ar) {
      courseFilter.$or = courseFilter.$or || [];

      if (filterProp.searchQuery.en) {
        courseFilter.$or.push({
          "Tags.en": { $regex: filterProp.searchQuery.en, $options: "i" },
        });
      }

      if (filterProp.searchQuery.ar) {
        courseFilter.$or.push({
          "Tags.ar": { $regex: filterProp.searchQuery.ar, $options: "i" },
        });
      }
    }

    if (filterProp.CourseDuration) {
      let [min, max] = filterProp.CourseDuration.split("-").map(Number);
      if (max === undefined) max = Infinity;
      courseFilter.$or = [
        {
          CourseDurationUnits: "Years",
          CourseDuration: { $gte: min / 12, $lte: max / 12 },
        },
        {
          CourseDurationUnits: "Months",
          CourseDuration: { $gte: min, $lte: max },
        },
        {
          CourseDurationUnits: "Weeks",
          CourseDuration: { $gte: min / 0.23, $lte: max / 0.23 },
        },
      ];
    }

    const courses = await courseModel
      .find(
        courseFilter,
        "CourseName CourseFees CourseDuration CourseDurationUnits ModeOfStudy Tags university"
      )
      .skip(courseSkip)
      .limit(limit)
      .lean(); // ✅ Add this

    // Step 4: Fetch Paginated Blogs
    // Step 4: Fetch Paginated Blogs for Each Country

    // Create university mapping
    const universityMap = universities.reduce((acc, uni) => {
      acc[uni._id.toString()] = { ...uni, courses: [] };
      return acc;
    }, {});

    // Assign courses to universities
    courses.forEach((course) => {
      if (universityMap[course.university.toString()]) {
        universityMap[course.university.toString()].courses.push(course);
      }
    });

    // Construct response with paginated universities & courses
    const countryData = countries.map((country) => ({
      ...country,
      universities: universities
        .filter((uni) => uni.uniCountry.toString() === country._id.toString())
        .map((uni) => ({
          ...uni,
          courseId: universityMap[uni._id.toString()]?.courses || [],
        })),
      blog: blogMap[country._id.toString()] || [], // ✅ Attach only relevant blogs
    }));

    // Count total documents

    const [totalCountries, totalUniversities, totalCourses, totalBlogs] =
      await Promise.all([
        countryModel.countDocuments(countryFilter),
        universityModel.countDocuments(universityFilter),
        courseModel.countDocuments(courseFilter),
        BlogModel.countDocuments(),
      ]);

    // Pagination metadata
    const pagination = {
      page,
      limit,
      totalCountries,
      totalUniversities,
      totalCourses,
      totalBlogs,
      totalPagesCountries: Math.ceil(totalCountries / limit),
      totalPagesUniversities: Math.ceil(totalUniversities / limit),
      totalPagesCourses: Math.ceil(totalCourses / limit),
      totalPagesBlogs: Math.ceil(totalBlogs / limit),
      hasMoreCountries: page * limit < totalCountries,
      hasMoreUniversities: universityPage * limit < totalUniversities,
      hasMoreCourses: coursePage * limit < totalCourses,
      hasMoreBlogs: blogPage * limit < totalBlogs,
    };

    res.status(200).json({ data: countryData, pagination });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAllCountries = async (req, res) => {
  try {
    const updateCountry = req.body;
    const result = await countryModel.updateMany({}, updateCountry);
    clearCountryCache();
    res.status(200).json({
      message: "Country updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating users", error: error.message });
  }
};

const updateCountry = async (req, res) => {
  const id = req.params.id;
  try {
    const countryData = await countryModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();

    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }

    await createNotification("Country", countryData, "countryName", "updated");

    // Remove country reference from universities if they were removed from the country model
    await universityModel.updateMany(
      { uniCountry: id, _id: { $nin: countryData.universities } },
      { $unset: { uniCountry: "" } }
    );

    await BlogModel.updateMany(
      { blogCountry: id, _id: { $nin: countryData.universities } },
      { $unset: { blogCountry: "" } }
    );

    clearCountryCache();
    res.status(200).json({
      data: countryData,
      message: "Country updated successfully and universities cleaned up!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteCountry = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find and delete the country
    const deletedCountry = await countryModel.findByIdAndDelete(id);
    if (!deletedCountry) {
      return res.status(404).json({ message: "Country not found" });
    }
    await createNotification(
      "Country",
      deletedCountry,
      "countryName",
      "deleted"
    );

    // Step 2: Remove country reference from universities
    await universityModel.updateMany(
      { uniCountry: id },
      { $unset: { uniCountry: "" } }
    );

    await BlogModel.updateMany(
      { blogCountry: id },
      { $unset: { blogCountry: "" } }
    );

    clearCountryCache();
    res.status(200).json({
      message: "Country deleted successfully and removed from universities!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCountry,
  getCountryById,
  getAllCountries,
  updateAllCountries,
  getAllCountriesByQuery,
  updateCountry,
  deleteCountry,
  getCountryByName,
  getFullDepthData,
  getFullDepthDataByFilter,
};
