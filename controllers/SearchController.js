const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const courseModel = require("../models/CourseModel");
const BlogModel = require("../models/BlogModel");
const NodeCache = require("node-cache"); // You'll need to install this: npm install node-cache

const queryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// const getCountries = async (req, res) => {
//   try {
//     let filterProp = {};
//     if (req.query.filterProp) {
//       try {
//         filterProp = JSON.parse(decodeURIComponent(req.query.filterProp));
//       } catch (error) {
//         console.error("Error parsing filterProp:", error.message);
//       }
//     }

//     // ✅ If no Destination filter is provided, return all countries
//     const countryFilter = filterProp.Destination?.length
//       ? { "countryName.en": { $in: filterProp.Destination } }
//       : {}; // Empty filter means fetch all

//     const countries = await countryModel
//       .find(countryFilter) // If empty, fetches all
//       .select("_id countryName countryPhotos customURLSlug countryCode")
//       .lean();

//     res.status(200).json({ data: countries });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getUniversitiesByCountries = async (req, res) => {
//   try {
//     const countryIds = req.query.countryIds
//       ? req.query.countryIds.split(",")
//       : [];
//     if (!countryIds.length)
//       return res.status(400).json({ message: "No country IDs provided" });

//     let universityFilter = { uniCountry: { $in: countryIds } };

//     if (req.query.StudyLevel && req.query.StudyLevel !== "All") {
//       universityFilter.studyLevel = { $in: [req.query.StudyLevel] };
//     }
//     if (req.query.EntranceExam) {
//       universityFilter.entranceExamRequired = req.query.EntranceExam;
//     }
//     if (req.query.UniType) {
//       universityFilter.uniType = {
//         $regex: new RegExp(`^${req.query.UniType}$`, "i"),
//       };
//     }
//     if (req.query.IntakeYear) {
//       universityFilter.inTakeYear = req.query.IntakeYear;
//     }
//     if (req.query.IntakeMonth) {
//       universityFilter.inTakeMonth = req.query.IntakeMonth;
//     }

//     // **New Step: Filter Universities Based on Matching Courses**
//     let courseFilter = {};
//     if (req.query.minBudget || req.query.maxBudget) {
//       courseFilter.CourseFees = {
//         $gte: Number(req.query.minBudget) || 0,
//         $lte: Number(req.query.maxBudget) || Infinity,
//       };
//     }
//     if (req.query.ModeOfStudy) {
//       courseFilter.$or = [
//         { "ModeOfStudy.en": req.query.ModeOfStudy },
//         { "ModeOfStudy.ar": req.query.ModeOfStudy },
//       ];
//     }

//     if (req.query.CourseDuration) {
//       let [min, max] = req.query.CourseDuration.includes("+")
//         ? [Number(req.query.CourseDuration.replace("+", "")), Infinity] // Handle "60+" as "60-Infinity"
//         : req.query.CourseDuration.split("-").map(Number);

//       if (max === undefined) max = Infinity; // Default max to Infinity if not provided

//       // ✅ Ensure $or is an array inside courseFilter before pushing conditions
//       courseFilter.$or = courseFilter.$or || [];

//       courseFilter.$or.push(
//         {
//           CourseDurationUnits: "Years",
//           CourseDuration: { $gte: min / 12, $lte: max / 12 },
//         },
//         {
//           CourseDurationUnits: "Months",
//           CourseDuration: { $gte: min, $lte: max },
//         },
//         {
//           CourseDurationUnits: "Weeks",
//           CourseDuration: { $gte: min / 0.23, $lte: max / 0.23 },
//         }
//       );
//     }
//     if (req.query.searchQuery) {
//       try {
//         const searchQuery = JSON.parse(req.query.searchQuery);
//         courseFilter.$or = courseFilter.$or || [];

//         if (searchQuery.en) {
//           courseFilter.$or.push({
//             "Tags.en": { $regex: searchQuery.en, $options: "i" },
//           });
//         }
//         if (searchQuery.ar) {
//           courseFilter.$or.push({
//             "Tags.ar": { $regex: searchQuery.ar, $options: "i" },
//           });
//         }
//       } catch (error) {
//         console.error("Error parsing searchQuery:", error.message);
//       }
//     }

//     // **Find universities that have at least one course matching the course filters**
//     if (Object.keys(courseFilter).length > 0) {
//       const matchingCourses = await courseModel
//         .find(courseFilter)
//         .select("university")
//         .lean();
//       const universityIds = matchingCourses
//         .filter((course) => course.university) // ✅ Remove null values
//         .map((course) => course.university.toString());

//       if (universityIds.length === 0) {
//         return res.status(200).json({
//           data: [],
//           pagination: {
//             page: 1,
//             limit: 10,
//             totalUniversities: 0,
//             totalPages: 0,
//             hasMore: false,
//           },
//         });
//       }
//       universityFilter._id = { $in: universityIds };
//     }

//     // **Pagination**
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const universities = await universityModel
//       .find(universityFilter)
//       .select(
//         "_id uniCountry uniName customURLSlug uniType studyLevel scholarshipAvailability uniDiscount uniTutionFees uniFeatured"
//       )
//       .populate("uniCountry", "countryName countryPhotos countryCode")
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const totalUniversities = await universityModel.countDocuments(
//       universityFilter
//     );

//     res.status(200).json({
//       data: universities,
//       pagination: {
//         page,
//         limit,
//         totalUniversities,
//         hasMore: page * limit < totalUniversities,
//         totalPages: Math.ceil(totalUniversities / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getCoursesByUniversities = async (req, res) => {
//   try {
//     const universityIds = req.query.universityIds
//       ? req.query.universityIds.split(",")
//       : [];
//     if (!universityIds.length)
//       return res.status(400).json({ message: "No university IDs provided" });

//     let courseFilter = { university: { $in: universityIds } };

//     if (req.query.minBudget || req.query.maxBudget) {
//       courseFilter.CourseFees = {
//         $gte: Number(req.query.minBudget) || 0,
//         $lte: Number(req.query.maxBudget) || Infinity,
//       };
//     }

//     // Initialize $or filter array
//     let orConditions = [];
//     if (req.query.CourseDuration) {
//       let [min, max] = req.query.CourseDuration.includes("+")
//         ? [Number(req.query.CourseDuration.replace("+", "")), Infinity] // Handle "60+" as "60-Infinity"
//         : req.query.CourseDuration.split("-").map(Number);

//       if (max === undefined) max = Infinity; // Default max to Infinity if not provided

//       orConditions.push(
//         {
//           CourseDurationUnits: "Years",
//           CourseDuration: { $gte: min / 12, $lte: max / 12 },
//         },
//         {
//           CourseDurationUnits: "Months",
//           CourseDuration: { $gte: min, $lte: max },
//         },
//         {
//           CourseDurationUnits: "Weeks",
//           CourseDuration: { $gte: min / 0.23, $lte: max / 0.23 },
//         }
//       );
//     }

//     if (req.query.ModeOfStudy) {
//       courseFilter.$or = [
//         { "ModeOfStudy.en": req.query.ModeOfStudy },
//         { "ModeOfStudy.ar": req.query.ModeOfStudy },
//       ];
//     }

//     if (req.query.searchQuery) {
//       const searchQuery = JSON.parse(req.query.searchQuery);
//       if (searchQuery.en || searchQuery.ar) {
//         orConditions.push(
//           searchQuery.en
//             ? { "Tags.en": { $regex: searchQuery.en, $options: "i" } }
//             : null,
//           searchQuery.ar
//             ? { "Tags.ar": { $regex: searchQuery.ar, $options: "i" } }
//             : null
//         );
//       }
//     }

//     // Apply $or filter if it has conditions
//     if (orConditions.length > 0) {
//       courseFilter.$or = orConditions.filter(Boolean); // Remove null values
//     }

//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 5;
//     const skip = (page - 1) * limit;

//     const courses = await courseModel
//       .find(courseFilter)
//       .select(
//         "CourseName CourseFees CourseDuration DeadLine ModeOfStudy Tags customURLSlug university Languages"
//       )
//       .populate(
//         "university",
//         "uniName uniType studyLevel  uniTutionFees  uniFeatured"
//       )
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const totalCourses = await courseModel.countDocuments(courseFilter);
//     res.status(200).json({
//       data: courses,
//       pagination: {
//         page,
//         limit,
//         totalCourses,
//         hasMore: page * limit < totalCourses, // ✅ Check if there are more courses
//         totalPages: Math.ceil(totalCourses / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getBlogsByCountries = async (req, res) => {
//   try {
//     const countryIds = req.query.countryIds
//       ? req.query.countryIds.split(",")
//       : [];
//     if (!countryIds.length)
//       return res.status(400).json({ message: "No country IDs provided" });

//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const blogs = await BlogModel.find({ blogCountry: { $in: countryIds } })
//       .select("blogTitle blogSubtitle blogAdded customURLSlug blogPhoto blogCountry")
//       .populate("blogCountry", "countryName countryPhotos countryCode")
//       .limit(limit)
//       .skip(skip)
//       .lean();

//     const totalBlogs = await BlogModel.countDocuments({
//       blogCountry: { $in: countryIds },
//     });

//     res.status(200).json({
//       data: blogs,
//       pagination: {
//         page,
//         limit,
//         totalBlogs,
//         totalPages: Math.ceil(totalBlogs / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Create cache instance with TTL of 10 minutes (600 seconds)

// Helper function to generate cache keys from request parameters
const generateCacheKey = (prefix, params) => {
  // Sort the keys to ensure consistent cache keys regardless of parameter order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// 1. Cached getCountries function
const getCountries = async (req, res) => {
  try {
    const startTime = Date.now();

    // Generate cache key based on filterProp
    const cacheKey = generateCacheKey("countries", {
      filterProp: req.query.filterProp || "",
    });

    // Check if we have cached results
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    let filterProp = {};
    if (req.query.filterProp) {
      try {
        filterProp = JSON.parse(decodeURIComponent(req.query.filterProp));
      } catch (error) {
        console.error("Error parsing filterProp:", error.message);
      }
    }

    // Build query
    const query = filterProp.Destination?.length
      ? { "countryName.en": { $in: filterProp.Destination } }
      : {};

    const countries = await countryModel
      .find(query)
      .select("_id countryName countryPhotos customURLSlug countryCode")
      .lean();

    // Prepare response
    const result = { data: countries };

    // Store in cache
    queryCache.set(cacheKey, result);

    const endTime = Date.now();
    console.log(`getCountries execution time: ${endTime - startTime}ms`);

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

    if (req.query.StudyLevel && req.query.StudyLevel !== "All") {
      universityFilter.studyLevel = { $in: [req.query.StudyLevel] };
    }

    if (req.query.EntranceExam) {
      universityFilter.entranceExamRequired = req.query.EntranceExam === "true";
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

    // Check if we need course filtering
    const needsCourseFiltering =
      req.query.minBudget ||
      req.query.maxBudget ||
      req.query.ModeOfStudy ||
      req.query.CourseDuration ||
      req.query.searchQuery;

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
    const courseMatchConditions = { university: { $in: [] } }; // Will be populated with university IDs

    if (req.query.minBudget || req.query.maxBudget) {
      courseMatchConditions.CourseFees = {};
      if (req.query.minBudget)
        courseMatchConditions.CourseFees.$gte = Number(req.query.minBudget);
      if (req.query.maxBudget)
        courseMatchConditions.CourseFees.$lte = Number(req.query.maxBudget);
    }

    // Handle course duration
    let durationConditions = [];
    if (req.query.CourseDuration) {
      let [min, max] = req.query.CourseDuration.includes("+")
        ? [Number(req.query.CourseDuration.replace("+", "")), Infinity]
        : req.query.CourseDuration.split("-").map(Number);

      if (max === undefined) max = Infinity;

      durationConditions = [
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

    // Handle mode of study
    let modeOfStudyConditions = [];
    if (req.query.ModeOfStudy) {
      modeOfStudyConditions = [
        { "ModeOfStudy.en": req.query.ModeOfStudy },
        { "ModeOfStudy.ar": req.query.ModeOfStudy },
      ];
    }

    // Handle search query
    let searchConditions = [];
    if (req.query.searchQuery) {
      try {
        const searchQuery = JSON.parse(req.query.searchQuery);

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
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

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

    // Build the final course query
    let courseQuery = { $and: [courseMatchConditions] };

    // Add $or conditions if they exist
    const orConditions = [
      ...durationConditions,
      ...modeOfStudyConditions,
      ...searchConditions,
    ];
    if (orConditions.length > 0) {
      courseQuery.$and.push({ $or: orConditions });
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

    const endTime = Date.now();
    console.log(`Query execution time: ${endTime - startTime}ms`);

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

    const endTime = Date.now();
    console.log(`Query execution time: ${endTime - startTime}ms`);

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

    const endTime = Date.now();
    console.log(`getBlogsByCountries execution time: ${endTime - startTime}ms`);

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
