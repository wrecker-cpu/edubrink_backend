const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const majorModel = require("../models/MajorsModel"); // Changed from courseModel
const BlogModel = require("../models/BlogModel");
const NodeCache = require("node-cache");

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

    // Check if we need major filtering - only consider non-empty values
    const needsMajorFiltering =
      (req.query.minBudget && req.query.minBudget !== "") ||
      (req.query.maxBudget && req.query.maxBudget !== "") ||
      (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") ||
      (req.query.MajorDuration && req.query.MajorDuration !== "") || // Changed from CourseDuration
      (req.query.searchQuery && req.query.searchQuery !== "");

    // Pagination
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Simple case - no major filtering needed
    if (!needsMajorFiltering) {
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

    // Complex case - need to filter by major properties
    // Build major match conditions
    const majorMatchConditions = {};

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
    majorMatchConditions.university = { $in: universityIds };

    // Add budget filter if provided
    if (req.query.minBudget || req.query.maxBudget) {
      majorMatchConditions.majorTuitionFees = {}; // Changed from CourseFees
      if (req.query.minBudget && req.query.minBudget !== "") {
        majorMatchConditions.majorTuitionFees.$gte = Number(
          req.query.minBudget
        );
      }
      if (req.query.maxBudget && req.query.maxBudget !== "") {
        majorMatchConditions.majorTuitionFees.$lte = Number(
          req.query.maxBudget
        );
      }
    }

    // Build the final major query
    let majorQuery = majorMatchConditions;
    const andConditions = [];

    // Handle major duration
    if (req.query.MajorDuration && req.query.MajorDuration !== "") {
      // Changed from CourseDuration
      let [min, max] = req.query.MajorDuration.includes("+")
        ? [
            Number(req.query.MajorDuration.replace("+", "")),
            Number.POSITIVE_INFINITY,
          ]
        : req.query.MajorDuration.split("-").map(Number);

      if (max === undefined) max = Number.POSITIVE_INFINITY;

      const durationConditions = [
        {
          durationUnits: "Years", // Changed from CourseDurationUnits
          duration: { $gte: min / 12, $lte: max / 12 }, // Changed from CourseDuration
        },
        {
          durationUnits: "Months", // Changed from CourseDurationUnits
          duration: { $gte: min, $lte: max }, // Changed from CourseDuration
        },
        {
          durationUnits: "Weeks", // Changed from CourseDurationUnits
          duration: { $gte: min / 0.23, $lte: max / 0.23 }, // Changed from CourseDuration
        },
      ];

      andConditions.push({ $or: durationConditions });
    }

    // Handle mode of study
    if (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") {
      const modeOfStudyConditions = [
        { modeOfStudy: { $in: [req.query.ModeOfStudy] } }, // Changed to match majorSchema
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
      majorQuery = { $and: [majorMatchConditions, ...andConditions] };
    }

    // Get distinct university IDs from majors
    const matchingMajorUniversities = await majorModel.distinct(
      "university",
      majorQuery
    );

    if (matchingMajorUniversities.length === 0) {
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
      _id: { $in: matchingMajorUniversities },
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

// 3. Cached getMajorsByUniversities function (renamed from getCoursesByUniversities)

const getMajorsByUniversities = async (req, res) => {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey("majors", req.query);

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

    // Build the major filter
    const majorFilter = { university: { $in: universityIds } };

    // Add budget filter - Note: majorTuitionFees is a string in your schema
    if (req.query.minBudget || req.query.maxBudget) {
      // For string comparison of numbers, we need to use $expr with $and
      const budgetConditions = [];

      if (req.query.minBudget) {
        const minBudget = Number(req.query.minBudget);
        budgetConditions.push({
          $gte: [{ $toDouble: "$majorTuitionFees" }, minBudget],
        });
      }

      if (req.query.maxBudget) {
        const maxBudget = Number(req.query.maxBudget);
        budgetConditions.push({
          $lte: [{ $toDouble: "$majorTuitionFees" }, maxBudget],
        });
      }

      if (budgetConditions.length > 0) {
        majorFilter.$expr = { $and: budgetConditions };
      }
    }

    // Add duration conditions - using duration and durationUnits fields
    if (req.query.MajorDuration) {
      let [min, max] = req.query.MajorDuration.includes("+")
        ? [
            Number(req.query.MajorDuration.replace("+", "")),
            Number.POSITIVE_INFINITY,
          ]
        : req.query.MajorDuration.split("-").map(Number);

      if (max === undefined) max = Number.POSITIVE_INFINITY;

      // Using the duration field from your schema
      const durationConditions = [];

      // Check if we should use duration or majorIntakeYear
      durationConditions.push(
        {
          durationUnits: "Years",
          duration: { $gte: min / 12, $lte: max / 12 },
        },
        {
          durationUnits: "Months",
          duration: { $gte: min, $lte: max },
        },
        {
          durationUnits: "Weeks",
          duration: { $gte: min / 0.23, $lte: max / 0.23 },
        }
      );

      if (durationConditions.length > 0) {
        majorFilter.$or = durationConditions;
      }
    }

    // Add mode of study filter - modeOfStudy is an array in your schema
    if (req.query.ModeOfStudy) {
      if (majorFilter.$or) {
        majorFilter.$and = [
          { $or: majorFilter.$or },
          { modeOfStudy: { $in: [req.query.ModeOfStudy] } },
        ];
        delete majorFilter.$or;
      } else {
        majorFilter.modeOfStudy = { $in: [req.query.ModeOfStudy] };
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

          if (majorFilter.$and) {
            majorFilter.$and.push({ $or: searchConditions });
          } else if (majorFilter.$or) {
            majorFilter.$and = [
              { $or: majorFilter.$or },
              { $or: searchConditions },
            ];
            delete majorFilter.$or;
          } else {
            majorFilter.$or = searchConditions;
          }
        }
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

    // Pagination
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Get count first
    const totalMajors = await majorModel.countDocuments(majorFilter);

    if (totalMajors === 0) {
      const emptyResult = {
        data: [],
        pagination: {
          page,
          limit,
          totalMajors: 0,
          hasMore: false,
          totalPages: 0,
        },
      };

      queryCache.set(cacheKey, emptyResult);
      return res.status(200).json(emptyResult);
    }

    // Get majors with pagination - adjust field selection based on your schema
    const majors = await majorModel
      .find(majorFilter)
      .select(
        "majorName majorTuitionFees studyLevel duration durationUnits majorIntakeMonth modeOfStudy Tags customURLSlug university majorLanguages majorCheckBox"
      )
      .populate("university", "uniName uniType uniSymbol uniFeatured")
      .skip(skip)
      .limit(limit)
      .lean();

    const result = {
      data: majors,
      pagination: {
        page,
        limit,
        totalMajors,
        hasMore: page * limit < totalMajors,
        totalPages: Math.ceil(totalMajors / limit),
      },
    };

    // Store in cache
    queryCache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getMajorsByUniversities:", error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Cached getBlogsByCountries function
const getBlogsByCountries = async (req, res) => {
  try {
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

    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
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

module.exports = {
  getCountries,
  getBlogsByCountries,
  getUniversitiesByCountries,
  getMajorsByUniversities, // Changed from getCoursesByUniversities
};
