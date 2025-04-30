const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const majorModel = require("../models/MajorsModel");
const BlogModel = require("../models/BlogModel");
const NodeCache = require("node-cache");

const queryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Improved generateCacheKey function
const generateCacheKey = (prefix, params) => {
  // Create a copy of params to avoid modifying the original
  const processedParams = { ...params };

  // Special handling for filterProp
  if (processedParams.filterProp) {
    try {
      if (typeof processedParams.filterProp === "string") {
        try {
          const parsedFilterProp = JSON.parse(
            decodeURIComponent(processedParams.filterProp)
          );
          processedParams.filterProp = JSON.stringify(parsedFilterProp);
        } catch (error) {
          console.error("Error parsing filterProp string:", error.message);
        }
      } else {
        processedParams.filterProp = JSON.stringify(processedParams.filterProp);
      }
    } catch (error) {
      console.error(
        "Error processing filterProp for cache key:",
        error.message
      );
    }
  }

  // Sort the keys for consistent cache keys
  const sortedParams = Object.keys(processedParams)
    .sort()
    .reduce((result, key) => {
      result[key] = processedParams[key];
      return result;
    }, {});

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

const getCountries = async (req, res) => {
  try {
    // Parse filterProp
    let parsedFilterProp = {};
    if (req.query.filterProp) {
      try {
        if (typeof req.query.filterProp === "string") {
          try {
            parsedFilterProp = JSON.parse(
              decodeURIComponent(req.query.filterProp)
            );
          } catch (error) {
            console.error("Error parsing filterProp string:", error.message);
            parsedFilterProp = {};
          }
        } else {
          parsedFilterProp = req.query.filterProp;
        }
      } catch (error) {
        console.error("Error handling filterProp:", error.message);
      }
    }

    const cacheKey = generateCacheKey("countries", {
      filterProp: parsedFilterProp,
    });

    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const query = parsedFilterProp.Destination?.length
      ? {
          $or: [
            { "countryName.en": { $in: parsedFilterProp.Destination } },
            { "countryName.ar": { $in: parsedFilterProp.Destination } },
          ],
        }
      : {};

    const countries = await countryModel
      .find(query)
      .select("_id countryName countryPhotos customURLSlug countryCode")
      .lean();

    const result = { data: countries };
    queryCache.set(cacheKey, result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getCountries:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUniversitiesByCountries = async (req, res) => {
  try {
    // Clear cache for this request to ensure we get fresh results
    const cacheKey = generateCacheKey("universities", req.query);
    queryCache.del(cacheKey);

    const countryIds = req.query.countryIds
      ? req.query.countryIds.split(",")
      : [];

    if (!countryIds.length)
      return res.status(400).json({ message: "No country IDs provided" });

    // Build the university filter
    const universityFilter = { uniCountry: { $in: countryIds } };

    // Add filters if they have valid values

    if (req.query.EntranceExam && req.query.EntranceExam !== "") {
      universityFilter.entranceExamRequired = req.query.EntranceExam === "true";
    }

    if (req.query.UniType && req.query.UniType !== "") {
      universityFilter.uniType = req.query.UniType;
    }

    // Check if we need major filtering
    const needsMajorFiltering =
      (req.query.minBudget && req.query.minBudget !== "") ||
      (req.query.maxBudget && req.query.maxBudget !== "") ||
      (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") ||
      (req.query.MajorDuration && req.query.MajorDuration !== "") ||
      (req.query.searchQuery && req.query.searchQuery !== "") ||
      (req.query.IntakeMonth && req.query.IntakeMonth !== "") ||
      (req.query.IntakeYear && req.query.IntakeYear !== "") ||
      (req.query.StudyLevel &&
        req.query.StudyLevel !== "All" &&
        req.query.StudyLevel !== "");
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

      return res.status(200).json(result);
    }

    // Complex case - need to filter by major properties
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

      return res.status(200).json(emptyResult);
    }

    // Extract university IDs
    const universityIds = matchingUniversities.map((uni) => uni._id);

    // Build major match conditions
    const majorQuery = { university: { $in: universityIds } };

    if (req.query.minBudget || req.query.maxBudget) {
      // Since majorTuitionFees is a string, we need to handle numeric comparisons carefully
      const budgetConditions = [];

      if (req.query.minBudget && req.query.minBudget !== "") {
        budgetConditions.push({
          $expr: {
            $gte: [
              { $toDouble: "$majorTuitionFees" },
              Number(req.query.minBudget),
            ],
          },
        });
      }

      if (req.query.maxBudget && req.query.maxBudget !== "") {
        budgetConditions.push({
          $expr: {
            $lte: [
              { $toDouble: "$majorTuitionFees" },
              Number(req.query.maxBudget),
            ],
          },
        });
      }

      if (budgetConditions.length > 0) {
        if (budgetConditions.length === 1) {
          Object.assign(majorQuery, budgetConditions[0]);
        } else {
          majorQuery.$and = budgetConditions;
        }
      }
    }

    // Create an array to hold all additional conditions
    const additionalConditions = [];

    // Handle major duration - FIXED
    if (req.query.MajorDuration && req.query.MajorDuration !== "") {
      let min, max;

      if (req.query.MajorDuration.includes("+")) {
        min = Number(req.query.MajorDuration.replace("+", ""));
        max = Number.POSITIVE_INFINITY;
      } else if (req.query.MajorDuration.includes("-")) {
        [min, max] = req.query.MajorDuration.split("-").map(Number);
      } else {
        min = max = Number(req.query.MajorDuration);
      }

      // IMPORTANT: Handle both numeric and string duration values
      // and handle all possible duration units
      const durationCondition = {
        $or: [
          // For Years
          {
            $and: [
              { durationUnits: "Years" },
              {
                $or: [
                  {
                    duration: {
                      $gte: min / 12,
                      $lte: max === Number.POSITIVE_INFINITY ? max : max / 12,
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min / 12] },
                        {
                          $lte: [
                            { $toDouble: "$duration" },
                            max === Number.POSITIVE_INFINITY ? max : max / 12,
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For Months
          {
            $and: [
              { durationUnits: "Months" },
              {
                $or: [
                  { duration: { $gte: min, $lte: max } },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min] },
                        { $lte: [{ $toDouble: "$duration" }, max] },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For Weeks
          {
            $and: [
              { durationUnits: "Weeks" },
              {
                $or: [
                  {
                    duration: {
                      $gte: min * 4.33,
                      $lte: max === Number.POSITIVE_INFINITY ? max : max * 4.33,
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min * 4.33] },
                        {
                          $lte: [
                            { $toDouble: "$duration" },
                            max === Number.POSITIVE_INFINITY ? max : max * 4.33,
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For missing or unspecified units
          {
            $and: [
              { duration: { $exists: true } },
              { durationUnits: { $exists: false } },
              {
                $expr: {
                  $and: [
                    { $gte: [{ $toDouble: "$duration" }, min] },
                    { $lte: [{ $toDouble: "$duration" }, max] },
                  ],
                },
              },
            ],
          },
        ],
      };
      additionalConditions.push(durationCondition);
    }

    // Handle mode of study
    if (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") {
      const modeOfStudyCondition = {
        modeOfStudy: { $in: [req.query.ModeOfStudy] },
      };
      additionalConditions.push(modeOfStudyCondition);
    }

    if (req.query.IntakeYear && req.query.IntakeYear !== "") {
      const intakeYearCondition = { majorIntakeYear: req.query.IntakeYear };
      additionalConditions.push(intakeYearCondition);
    }

    if (
      req.query.StudyLevel &&
      req.query.StudyLevel !== "All" &&
      req.query.StudyLevel !== ""
    ) {
      const studyLevelCondition = {
        studyLevel: { $in: [req.query.StudyLevel] },
      };
      additionalConditions.push(studyLevelCondition);
    }

    // Handle IntakeMonth filter
    if (req.query.IntakeMonth && req.query.IntakeMonth !== "") {
      const intakeMonthCondition = {
        majorIntakeMonth: { $in: [req.query.IntakeMonth] },
      };
      additionalConditions.push(intakeMonthCondition);
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
          additionalConditions.push({ $or: searchConditions });
        }
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

    // Combine all conditions into the final query
    if (additionalConditions.length > 0) {
      if (majorQuery.$and) {
        majorQuery.$and = [...majorQuery.$and, ...additionalConditions];
      } else {
        majorQuery.$and = additionalConditions;
      }
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

const getMajorsByUniversities = async (req, res) => {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey("majors", req.query);

    // Clear cache for this request to ensure we get fresh results
    queryCache.del(cacheKey);

    const hasFilterProp = req.query.hasFilterProp === "true" ? true : false;

    let universityIds = [];

    // If filterProp is not passed, get all university IDs
    if (hasFilterProp === false) {
      // Get all university IDs from the database
      const allUniversities = await universityModel.find().select("_id").lean();
      universityIds = allUniversities.map((uni) => uni._id);
    } else if (hasFilterProp === true) {
      // Use the provided university IDs as before
      universityIds = req.query.universityIds
        ? req.query.universityIds.split(",")
        : [];
    }
    if (!universityIds.length)
      return res.status(400).json({ message: "No university IDs provided" });

    // Build the major filter
    const majorFilter = { university: { $in: universityIds } };

    // Add studyLevel filter to majors if provided

    // Add budget filter - handle string to number conversion
    if (req.query.minBudget || req.query.maxBudget) {
      const budgetConditions = [];

      if (req.query.minBudget && req.query.minBudget !== "") {
        budgetConditions.push({
          $expr: {
            $gte: [
              { $toDouble: "$majorTuitionFees" },
              Number(req.query.minBudget),
            ],
          },
        });
      }

      if (req.query.maxBudget && req.query.maxBudget !== 10000) {
        budgetConditions.push({
          $expr: {
            $lte: [
              { $toDouble: "$majorTuitionFees" },
              Number(req.query.maxBudget),
            ],
          },
        });
      }

      if (budgetConditions.length > 0) {
        if (budgetConditions.length === 1) {
          Object.assign(majorFilter, budgetConditions[0]);
        } else {
          majorFilter.$and = budgetConditions;
        }
      }
    }

    // Create an array to hold all additional conditions
    const additionalConditions = [];

    // Add duration conditions - FIXED
    if (req.query.MajorDuration && req.query.MajorDuration !== "") {
      let min, max;

      if (req.query.MajorDuration.includes("+")) {
        min = Number(req.query.MajorDuration.replace("+", ""));
        max = Number.POSITIVE_INFINITY;
      } else if (req.query.MajorDuration.includes("-")) {
        [min, max] = req.query.MajorDuration.split("-").map(Number);
      } else {
        min = max = Number(req.query.MajorDuration);
      }

      // IMPORTANT: Handle both numeric and string duration values
      // and handle all possible duration units
      const durationCondition = {
        $or: [
          // For Years
          {
            $and: [
              { durationUnits: "Years" },
              {
                $or: [
                  {
                    duration: {
                      $gte: min / 12,
                      $lte: max === Number.POSITIVE_INFINITY ? max : max / 12,
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min / 12] },
                        {
                          $lte: [
                            { $toDouble: "$duration" },
                            max === Number.POSITIVE_INFINITY ? max : max / 12,
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For Months
          {
            $and: [
              { durationUnits: "Months" },
              {
                $or: [
                  { duration: { $gte: min, $lte: max } },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min] },
                        { $lte: [{ $toDouble: "$duration" }, max] },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For Weeks
          {
            $and: [
              { durationUnits: "Weeks" },
              {
                $or: [
                  {
                    duration: {
                      $gte: min * 4.33,
                      $lte: max === Number.POSITIVE_INFINITY ? max : max * 4.33,
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $gte: [{ $toDouble: "$duration" }, min * 4.33] },
                        {
                          $lte: [
                            { $toDouble: "$duration" },
                            max === Number.POSITIVE_INFINITY ? max : max * 4.33,
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          // For missing or unspecified units
          {
            $and: [
              { duration: { $exists: true } },
              { durationUnits: { $exists: false } },
              {
                $expr: {
                  $and: [
                    { $gte: [{ $toDouble: "$duration" }, min] },
                    { $lte: [{ $toDouble: "$duration" }, max] },
                  ],
                },
              },
            ],
          },
        ],
      };
      additionalConditions.push(durationCondition);
    }

    if (req.query.IntakeYear && req.query.IntakeYear !== "") {
      const intakeYearCondition = { majorIntakeYear: req.query.IntakeYear };
      additionalConditions.push(intakeYearCondition);
    }

    // Handle IntakeMonth filter
    if (req.query.IntakeMonth && req.query.IntakeMonth !== "") {
      const intakeMonthCondition = {
        majorIntakeMonth: { $in: [req.query.IntakeMonth] },
      };
      additionalConditions.push(intakeMonthCondition);
    }

    if (
      req.query.StudyLevel &&
      req.query.StudyLevel !== "All" &&
      req.query.StudyLevel !== ""
    ) {
      const studyLevelCondition = {
        studyLevel: { $in: [req.query.StudyLevel] },
      };
      additionalConditions.push(studyLevelCondition);
    }

    // Add mode of study filter
    if (req.query.ModeOfStudy && req.query.ModeOfStudy !== "") {
      const modeOfStudyCondition = {
        modeOfStudy: { $in: [req.query.ModeOfStudy] },
      };
      additionalConditions.push(modeOfStudyCondition);
    }

    // Add search query filter
    if (req.query.searchQuery && req.query.searchQuery !== "") {
      try {
        const searchQuery = JSON.parse(req.query.searchQuery);
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

        if (searchConditions.length > 0) {
          additionalConditions.push({ $or: searchConditions });
        }
      } catch (error) {
        console.error("Error parsing searchQuery:", error.message);
      }
    }

    // Combine all conditions into the final query
    if (additionalConditions.length > 0) {
      if (majorFilter.$and) {
        majorFilter.$and = [...majorFilter.$and, ...additionalConditions];
      } else {
        majorFilter.$and = additionalConditions;
      }
    }

    // Pagination
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // FIXED: Get accurate count with all filters applied
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

      return res.status(200).json(emptyResult);
    }

    // Get majors with pagination
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
  getMajorsByUniversities,
};
