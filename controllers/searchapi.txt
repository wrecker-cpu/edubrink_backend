const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const BlogModel = require("../models/BlogModel");
const NodeCache = require("node-cache"); // You'll need to install this: npm install node-cache

const queryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Modified generateCacheKey function to handle filterProp properly
const generateCacheKey = (prefix, params) => {
  // Create a copy of params to avoid modifying the original
  const processedParams = { ...params };

  // Special handling for filterProp - handle both string and object formats
  if (processedParams.filterProp) {
    try {
      // Check if filterProp is a string that needs parsing
      if (typeof processedParams.filterProp === "string") {
        try {
          // Try to parse it as JSON
          const parsedFilterProp = JSON.parse(
            decodeURIComponent(processedParams.filterProp)
          );
          processedParams.filterProp = JSON.stringify(parsedFilterProp);
        } catch (error) {
          // If it's not valid JSON, just use it as is
          console.error("Error parsing filterProp string:", error.message);
        }
      } else {
        // It's already an object, just stringify it
        processedParams.filterProp = JSON.stringify(processedParams.filterProp);
      }
    } catch (error) {
      console.error(
        "Error processing filterProp for cache key:",
        error.message
      );
    }
  }

  // Sort the keys to ensure consistent cache keys regardless of parameter order
  const sortedParams = Object.keys(processedParams)
    .sort()
    .reduce((result, key) => {
      result[key] = processedParams[key];
      return result;
    }, {});

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// Modified getCountries function
const getCountries = async (req, res) => {
  try {
    const startTime = Date.now();

    // Parse filterProp first to ensure cache key is based on parsed content
    let parsedFilterProp = {};
    if (req.query.filterProp) {
      try {
        // Check if filterProp is a string that needs parsing
        if (typeof req.query.filterProp === "string") {
          try {
            parsedFilterProp = JSON.parse(
              decodeURIComponent(req.query.filterProp)
            );
          } catch (error) {
            console.error("Error parsing filterProp string:", error.message);
            // If it can't be parsed, use it as is (might be an empty object)
            parsedFilterProp = {};
          }
        } else {
          // It's already an object
          parsedFilterProp = req.query.filterProp;
        }
      } catch (error) {
        console.error("Error handling filterProp:", error.message);
      }
    }

    // Generate cache key based on parsed filterProp
    const cacheKey = generateCacheKey("countries", {
      filterProp: parsedFilterProp,
    });

    // Check if we have cached results
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    // Build query
    const query = parsedFilterProp.Destination?.length
      ? { "countryName.en": { $in: parsedFilterProp.Destination } }
      : {};

    const countries = await countryModel
      .find(query)
      .select("_id countryName countryPhotos customURLSlug countryCode")
      .lean();

    // Prepare response
    const result = { data: countries };

    // Store in cache
    queryCache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getCountries:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Cached getUniversitiesByCountries function
const getUniversitiesByCountries = async (req, res) => {
  try {
    const startTime = Date.now();

    // Generate cache key from all query parameters
    const cacheKey = generateCacheKey("universities", req.query);

    // Check cache
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const countryIds = req.query.countryIds
      ? req.query.countryIds.split(",")
      : [];

    if (!countryIds.length)
      return res.status(400).json({ message: "No country IDs provided" });

    // Build the university filter
    const universityFilter = { uniCountry: { $in: countryIds } };

    // Only add filters if they have valid non-empty values
    if (
      req.query.StudyLevel &&
      req.query.StudyLevel !== "All" &&
      req.query.StudyLevel !== ""
    ) {
      universityFilter.studyLevel = { $in: [req.query.StudyLevel] };
    }

    if (req.query.EntranceExam && req.query.EntranceExam !== "") {
      universityFilter.entranceExamRequired = req.query.EntranceExam === "true";
    }

    if (req.query.UniType && req.query.UniType !== "") {
      universityFilter.uniType = req.query.UniType;
    }

    if (req.query.IntakeYear && req.query.IntakeYear !== "") {
      universityFilter.inTakeYear = req.query.IntakeYear;
    }

    if (req.query.IntakeMonth && req.query.IntakeMonth !== "") {
      universityFilter.inTakeMonth = req.query.IntakeMonth;
    }

    // Check if we need course filtering - only consider non-empty values
    const needsCourseFiltering =
      (req.query.minBudget && req.query.minBudget !== "") ||
      (req.query.maxBudget && req.query.maxBudget !== "") ||
      (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") ||
      (req.query.CourseDuration && req.query.CourseDuration !== "") ||
      (req.query.searchQuery && req.query.searchQuery !== "");

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Simple case - no course filtering needed
    if (!needsCourseFiltering) {
      const totalUniversities = await universityModel.countDocuments(
        universityFilter
      );

      if (totalUniversities === 0) {
        const emptyResult = {
          data: [],
          pagination: {
            page,
            limit,
            totalUniversities: 0,
            totalPages: 0,
            hasMore: false,
          },
        };

        queryCache.set(cacheKey, emptyResult);
        return res.status(200).json(emptyResult);
      }

      const universities = await universityModel
        .find(universityFilter)
        .select(
          "_id uniCountry uniName uniSymbol customURLSlug uniType studyLevel scholarshipAvailability uniDiscount uniTutionFees uniFeatured"
        )
        .populate("uniCountry", "countryName countryPhotos countryCode")
        .skip(skip)
        .limit(limit)
        .lean();

      const result = {
        data: universities,
        pagination: {
          page,
          limit,
          totalUniversities,
          hasMore: page * limit < totalUniversities,
          totalPages: Math.ceil(totalUniversities / limit),
        },
      };

      queryCache.set(cacheKey, result);
      return res.status(200).json(result);
    }

    // Complex case - need to filter by course properties
    // Build course match conditions
    const courseMatchConditions = {};

    // Get university IDs first
    const matchingUniversities = await universityModel
      .find(universityFilter)
      .select("_id")
      .lean();

    if (matchingUniversities.length === 0) {
      const emptyResult = {
        data: [],
        pagination: {
          page,
          limit,
          totalUniversities: 0,
          totalPages: 0,
          hasMore: false,
        },
      };

      queryCache.set(cacheKey, emptyResult);
      return res.status(200).json(emptyResult);
    }

    // Extract university IDs
    const universityIds = matchingUniversities.map((uni) => uni._id);
    courseMatchConditions.university = { $in: universityIds };

    // Add budget filter if provided
    if (req.query.minBudget || req.query.maxBudget) {
      courseMatchConditions.CourseFees = {};
      if (req.query.minBudget && req.query.minBudget !== "") {
        courseMatchConditions.CourseFees.$gte = Number(req.query.minBudget);
      }
      if (req.query.maxBudget && req.query.maxBudget !== "") {
        courseMatchConditions.CourseFees.$lte = Number(req.query.maxBudget);
      }
    }

    // Build the final course query
    let courseQuery = courseMatchConditions;
    const andConditions = [];

    // Handle course duration
    if (req.query.CourseDuration && req.query.CourseDuration !== "") {
      let [min, max] = req.query.CourseDuration.includes("+")
        ? [Number(req.query.CourseDuration.replace("+", "")), Infinity]
        : req.query.CourseDuration.split("-").map(Number);

      if (max === undefined) max = Infinity;

      const durationConditions = [
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

      andConditions.push({ $or: durationConditions });
    }

    // Handle mode of study
    if (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") {
      const modeOfStudyConditions = [
        { "ModeOfStudy.en": req.query.ModeOfStudy },
        { "ModeOfStudy.ar": req.query.ModeOfStudy },
      ];

      andConditions.push({ $or: modeOfStudyConditions });
    }

    // Handle search query
    if (req.query.searchQuery && req.query.searchQuery !== "") {
      try {
        const searchQuery = JSON.parse(req.query.searchQuery);
        const searchConditions = [];

        if (searchQuery.en && searchQuery.en !== "") {
          searchConditions.push({
            "Tags.en": { $regex: searchQuery.en, $options: "i" },
          });
        }

        if (searchQuery.ar && searchQuery.ar !== "") {
          searchConditions.push({
            "Tags.ar": { $regex: searchQuery.ar, $options: "i" },
          });
        }

        if (searchConditions.length > 0) {
          andConditions.push({ $or: searchConditions });
        }
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

    // Only add $and if we have additional conditions
    if (andConditions.length > 0) {
      courseQuery = { $and: [courseMatchConditions, ...andConditions] };
    }

    // Get distinct university IDs from courses
    const matchingCourseUniversities = await courseModel.distinct(
      "university",
      courseQuery
    );

    if (matchingCourseUniversities.length === 0) {
      const emptyResult = {
        data: [],
        pagination: {
          page,
          limit,
          totalUniversities: 0,
          totalPages: 0,
          hasMore: false,
        },
      };

      queryCache.set(cacheKey, emptyResult);
      return res.status(200).json(emptyResult);
    }

    // Final university query with the filtered IDs
    const finalUniversityFilter = {
      ...universityFilter,
      _id: { $in: matchingCourseUniversities },
    };

    // Get total count
    const totalUniversities = await universityModel.countDocuments(
      finalUniversityFilter
    );

    // Get paginated results
    const universities = await universityModel
      .find(finalUniversityFilter)
      .select(
        "_id uniCountry uniName uniSymbol customURLSlug uniType studyLevel scholarshipAvailability uniDiscount uniTutionFees uniFeatured"
      )
      .populate("uniCountry", "countryName countryPhotos countryCode")
      .skip(skip)
      .limit(limit)
      .lean();

    const result = {
      data: universities,
      pagination: {
        page,
        limit,
        totalUniversities,
        hasMore: page * limit < totalUniversities,
        totalPages: Math.ceil(totalUniversities / limit),
      },
    };

    // Store in cache
    queryCache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getUniversitiesByCountries:", error);
    res.status(500).json({ message: error.message });
  }
};

// 3. Cached getCoursesByUniversities function
const getCoursesByUniversities = async (req, res) => {
  try {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = generateCacheKey("courses", req.query);

    // Check cache
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const universityIds = req.query.universityIds
      ? req.query.universityIds.split(",")
      : [];

    if (!universityIds.length)
      return res.status(400).json({ message: "No university IDs provided" });

    // Build the course filter
    const courseFilter = { university: { $in: universityIds } };

    // Add budget filter
    if (req.query.minBudget || req.query.maxBudget) {
      courseFilter.CourseFees = {};
      if (req.query.minBudget)
        courseFilter.CourseFees.$gte = Number(req.query.minBudget);
      if (req.query.maxBudget)
        courseFilter.CourseFees.$lte = Number(req.query.maxBudget);
    }

    // Add duration conditions
    if (req.query.CourseDuration) {
      let [min, max] = req.query.CourseDuration.includes("+")
        ? [Number(req.query.CourseDuration.replace("+", "")), Infinity]
        : req.query.CourseDuration.split("-").map(Number);

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

    // Add mode of study filter
    if (req.query.ModeOfStudy) {
      if (courseFilter.$or) {
        courseFilter.$and = [
          { $or: courseFilter.$or },
          {
            $or: [
              { "ModeOfStudy.en": req.query.ModeOfStudy },
              { "ModeOfStudy.ar": req.query.ModeOfStudy },
            ],
          },
        ];
        delete courseFilter.$or;
      } else {
        courseFilter.$or = [
          { "ModeOfStudy.en": req.query.ModeOfStudy },
          { "ModeOfStudy.ar": req.query.ModeOfStudy },
        ];
      }
    }

    // Add search query filter
    if (req.query.searchQuery) {
      try {
        const searchQuery = JSON.parse(req.query.searchQuery);

        if (searchQuery.en || searchQuery.ar) {
          const searchConditions = [];

          if (searchQuery.en) {
            searchConditions.push({
              "Tags.en": { $regex: searchQuery.en, $options: "i" },
            });
          }

          if (searchQuery.ar) {
            searchConditions.push({
              "Tags.ar": { $regex: searchQuery.ar, $options: "i" },
            });
          }

          if (courseFilter.$and) {
            courseFilter.$and.push({ $or: searchConditions });
          } else if (courseFilter.$or) {
            courseFilter.$and = [
              { $or: courseFilter.$or },
              { $or: searchConditions },
            ];
            delete courseFilter.$or;
          } else {
            courseFilter.$or = searchConditions;
          }
        }
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Get count first
    const totalCourses = await courseModel.countDocuments(courseFilter);

    if (totalCourses === 0) {
      const emptyResult = {
        data: [],
        pagination: {
          page,
          limit,
          totalCourses: 0,
          hasMore: false,
          totalPages: 0,
        },
      };

      queryCache.set(cacheKey, emptyResult);
      return res.status(200).json(emptyResult);
    }

    // Get courses with pagination
    const courses = await courseModel
      .find(courseFilter)
      .select(
        "CourseName CourseFees CourseDuration DeadLine ModeOfStudy Tags customURLSlug university Languages"
      )
      .populate(
        "university",
        "uniName uniType studyLevel uniTutionFees uniFeatured"
      )
      .skip(skip)
      .limit(limit)
      .lean();

    const result = {
      data: courses,
      pagination: {
        page,
        limit,
        totalCourses,
        hasMore: page * limit < totalCourses,
        totalPages: Math.ceil(totalCourses / limit),
      },
    };

    // Store in cache
    queryCache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getCoursesByUniversities:", error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Cached getBlogsByCountries function
const getBlogsByCountries = async (req, res) => {
  try {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = generateCacheKey("blogs", req.query);

    // Check cache
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const countryIds = req.query.countryIds
      ? req.query.countryIds.split(",")
      : [];

    if (!countryIds.length)
      return res.status(400).json({ message: "No country IDs provided" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get count first
    const totalBlogs = await BlogModel.countDocuments({
      blogCountry: { $in: countryIds },
    });

    if (totalBlogs === 0) {
      const emptyResult = {
        data: [],
        pagination: {
          page,
          limit,
          totalBlogs: 0,
          totalPages: 0,
        },
      };

      queryCache.set(cacheKey, emptyResult);
      return res.status(200).json(emptyResult);
    }

    // Get blogs with pagination
    const blogs = await BlogModel.find({ blogCountry: { $in: countryIds } })
      .select(
        "blogTitle blogSubtitle blogAdded customURLSlug blogPhoto blogCountry"
      )
      .populate("blogCountry", "countryName countryPhotos countryCode")
      .skip(skip)
      .limit(limit)
      .lean();

    const result = {
      data: blogs,
      pagination: {
        page,
        limit,
        totalBlogs,
        totalPages: Math.ceil(totalBlogs / limit),
      },
    };

    // Store in cache
    queryCache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getBlogsByCountries:", error);
    res.status(500).json({ message: error.message });
  }
};

// Cache management functions
const clearCache = (req, res) => {
  try {
    queryCache.flushAll();
    res.status(200).json({ message: "Cache cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearCacheByPattern = (req, res) => {
  try {
    const pattern = req.params.pattern;
    if (!pattern) {
      return res.status(400).json({ message: "Pattern is required" });
    }

    const keys = queryCache.keys();
    let count = 0;

    keys.forEach((key) => {
      if (key.startsWith(pattern)) {
        queryCache.del(key);
        count++;
      }
    });

    res.status(200).json({
      message: `Cleared ${count} cache entries matching pattern: ${pattern}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to invalidate cache when data changes
const invalidateCache = (prefix) => {
  const keys = queryCache.keys();
  keys.forEach((key) => {
    if (key.startsWith(prefix)) {
      queryCache.del(key);
    }
  });
};

module.exports = {
  getCountries,
  getBlogsByCountries,
  getUniversitiesByCountries,
  getCoursesByUniversities,
};
