const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 310 });
const universityModel = require("../models/UniversityModel");
const countryModel = require("../models/CountryModel");
const courseModel = require("../models/CourseModel");
const { createNotification } = require("../controllers/HelperController");
const MajorsModel = require("../models/MajorsModel");
const { clearCache } = require("../controllers/SearchController");

// Create a new University
const createUniversity = async (req, res) => {
  try {
    const { uniCountry, ...uniDetails } = req.body;

    // Create the university
    const newUniversity = new universityModel(uniDetails);
    await newUniversity.save();

    await createNotification("University", newUniversity, "uniName", "created");

    // Update the country model with the new university ID
    if (uniCountry) {
      await countryModel.findByIdAndUpdate(
        uniCountry,
        { $push: { universities: newUniversity._id } },
        { new: true }
      );
    }

    res.status(201).json({
      data: newUniversity,
      message: "University created successfully and linked to country!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Read (Get) a University by ID
const getUniversityById = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel
      .findById(id)
      .lean()
      .populate("courseId uniCountry major");
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ data: universityData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUniversityByName = async (req, res) => {
  const name = req.params.name;
  const coursePage = Number.parseInt(req.query.coursePage) || 1;
  const courseLimit = Number.parseInt(req.query.courseLimit) || 2;
  const majorPage = Number.parseInt(req.query.majorPage) || 1;
  const majorLimit = Number.parseInt(req.query.majorLimit) || 2;
  const studyLevel = req.query.studyLevel
    ? Array.isArray(req.query.studyLevel)
      ? req.query.studyLevel
      : req.query.studyLevel.split(",")
    : [];

  const modeOfStudy = req.query.modeOfStudy
    ? Array.isArray(req.query.modeOfStudy)
      ? req.query.modeOfStudy
      : req.query.modeOfStudy.split(",")
    : [];

  try {
    // First, get all course IDs for the university to use in the languages lookup
    const university = await universityModel.findOne({
      $or: [
        { "uniName.en": { $regex: name, $options: "i" } },
        { "uniName.ar": { $regex: name, $options: "i" } },
        { "customURLSlug.en": { $regex: name, $options: "i" } },
        { "customURLSlug.ar": { $regex: name, $options: "i" } },
      ],
    });

    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    // Get all languages and modes of study from courses associated with this university
    const courseData = await courseModel.aggregate([
      {
        $match: {
          _id: { $in: university.courseId || [] },
        },
      },
      {
        $facet: {
          languages: [
            { $unwind: "$Languages" },
            { $group: { _id: null, values: { $addToSet: "$Languages" } } },
          ],
          modeOfStudyEn: [
            { $unwind: "$ModeOfStudy.en" },
            { $group: { _id: null, values: { $addToSet: "$ModeOfStudy.en" } } },
          ],
          modeOfStudyAr: [
            { $unwind: "$ModeOfStudy.ar" },
            { $group: { _id: null, values: { $addToSet: "$ModeOfStudy.ar" } } },
          ],
        },
      },
    ]);

    // Extract values or default to empty arrays
    const languages = courseData[0]?.languages[0]?.values || [];
    const modeOfStudyEn = courseData[0]?.modeOfStudyEn[0]?.values || [];
    const modeOfStudyAr = courseData[0]?.modeOfStudyAr[0]?.values || [];

    const universityData = await universityModel.aggregate([
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: name, $options: "i" } },
            { "uniName.ar": { $regex: name, $options: "i" } },
            { "customURLSlug.en": { $regex: name, $options: "i" } },
            { "customURLSlug.ar": { $regex: name, $options: "i" } },
          ],
        },
      },
      // Ensure courseId and major are arrays
      {
        $addFields: {
          courseId: { $ifNull: ["$courseId", []] },
          major: { $ifNull: ["$major", []] },
          // Add the extracted languages
          spokenLanguage: languages,
          // Create a new field for study programs (don't modify the existing one)
          studyProgramsNew: {
            en: modeOfStudyEn,
            ar: modeOfStudyAr,
          },
        },
      },
      {
        $lookup: {
          from: "countries",
          localField: "uniCountry",
          foreignField: "_id",
          as: "country",
        },
      },
      {
        $unwind: {
          path: "$country",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          countryName: { $ifNull: ["$country.countryName", ""] },
          countryFlag: { $ifNull: ["$country.countryPhotos.countryFlag", ""] },
          countryCode: { $ifNull: ["$country.countryCode", ""] },
          customURLSlug: { $ifNull: ["$country.customURLSlug", ""] },
        },
      },
      {
        $lookup: {
          from: "courses",
          let: { courseIds: "$courseId" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$courseIds"] } } },
            ...(studyLevel.length > 0
              ? [
                  {
                    $match: { StudyLevel: { $in: studyLevel } },
                  },
                ]
              : []),
            ...(modeOfStudy.length > 0
              ? [
                  {
                    $match: { "ModeOfStudy.en": { $in: modeOfStudy } },
                  },
                ]
              : []),
            { $skip: (coursePage - 1) * courseLimit },
            { $limit: courseLimit },
            {
              $project: {
                CourseName: 1,
                CourseDuration: 1,
                CourseFees: 1,
                CourseDurationUnits: 1,
                Languages: 1,
                ModeOfStudy: 1,
                DeadLine: 1,
                StudyLevel: 1,
                customURLSlug: 1,
              },
            },
          ],
          as: "courses",
        },
      },
      {
        $lookup: {
          from: "majors",
          let: { majorIds: "$major" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$majorIds"] } } },
            ...(studyLevel.length > 0
              ? [
                  {
                    $match: { studyLevel: { $in: studyLevel } },
                  },
                ]
              : []),
            ...(modeOfStudy.length > 0
              ? [
                  {
                    $match: { modeOfStudy: { $in: modeOfStudy } },
                  },
                ]
              : []),
            { $skip: (majorPage - 1) * majorLimit },
            { $limit: majorLimit },
            {
              $project: {
                majorName: 1,
                majorTuitionFees: 1,
                studyLevel: 1,
                duration: 1,
                durationUnits: 1,
                modeOfStudy: 1,
                customURLSlug: 1,
              },
            },
          ],
          as: "majors",
        },
      },
      {
        $addFields: {
          totalCourses: { $size: "$courseId" },
          totalMajors: { $size: "$major" },
          highestCourseTuitionFees: {
            $cond: {
              if: { $gt: [{ $size: "$courses" }, 0] },
              then: { $max: "$courses.CourseFees" },
              else: null,
            },
          },
          lowestCourseTuitionFees: {
            $cond: {
              if: { $gt: [{ $size: "$courses" }, 0] },
              then: { $min: "$courses.CourseFees" },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          uniName: 1,
          uniSymbol: 1,
          courses: 1,
          majors: 1,
          uniMainImage: 1,
          scholarshipAvailability: 1,
          housing_available: 1,
          living_cost: 1,
          admission_requirements: 1,
          preparatory_year: 1,
          preparatory_year_fees: 1,
          study_programs: 1, // Keep the original field
          studyProgramsNew: 1, // Include our new field
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          country: 1,
          scholarshipsAvailable: 1,
          scholarshipType: 1,
          scholarshipPercentage: 1,
          DiscountAvailable: 1,
          DiscountValue: 1,
          campuses: 1,
          faq: 1,
          seo: 1,
          uniTutionFees: 1,
          uniCreationDate: 1,
          uniStartDate: 1,
          uniDeadline: 1,
          uniDuration: 1,
          uniDiscount: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniFeatured: 1,
          uniLibrary: 1,
          uniSports: 1,
          studentLifeStyleInUni: 1,
          customURLSlug: 1,
          totalCourses: 1,
          totalMajors: 1,
          highestCourseTuitionFees: 1,
          lowestCourseTuitionFees: 1,
        },
      },
    ]);

    if (!universityData || universityData.length === 0) {
      return res.status(404).json({ message: "University not found" });
    }

    // Create a copy of the university data
    const responseData = { ...universityData[0] };

    // Filter out "none" values from the new study programs field
    const filteredStudyPrograms = {
      en: (responseData.studyProgramsNew?.en || []).filter(
        (item) => item && item !== "none"
      ),
      ar: (responseData.studyProgramsNew?.ar || []).filter(
        (item) => item && item !== "none"
      ),
    };

    // Replace the original study_programs with our filtered version
    responseData.study_programs = filteredStudyPrograms;

    // Remove the temporary field
    delete responseData.studyProgramsNew;

    res.status(200).json({
      data: responseData,
      message: "University fetched successfully",
      coursePagination: {
        page: coursePage,
        limit: courseLimit,
        total: universityData[0].totalCourses,
      },
      majorPagination: {
        page: majorPage,
        limit: majorLimit,
        total: universityData[0].totalMajors,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllUniversities = async (req, res) => {
  try {
    // Aggregation pipeline to join universities with their countries and populate courses
    const universityData = await universityModel.aggregate([
      // Lookup country data by matching universities' ids in the country's universities array
      {
        $lookup: {
          from: "countries", // The countries collection to join
          localField: "_id", // The university _id
          foreignField: "universities", // Field in country that references university _id
          as: "country", // This will add the country data in a new array field "country"
        },
      },
      {
        $unwind: {
          path: "$country", // Unwind the country array to get a single object instead of an array
          preserveNullAndEmptyArrays: true, // Preserve universities without a matching country
        },
      },
      {
        $addFields: {
          countryName: {
            $ifNull: ["$country.countryName", ""], // Default to empty string if countryName is missing
          },
          countryFlag: {
            $ifNull: ["$country.countryPhotos.countryFlag", ""], // Default to empty string if countryFlag is missing
          },
          countryCode: {
            $ifNull: ["$country.countryCode", ""], // Default to empty string if countryFlag is missing
          },
        },
      },
      // Lookup to populate the courseId field with course data
      {
        $lookup: {
          from: "courses", // The courses collection to join
          localField: "courseId", // The field in University model containing course IDs
          foreignField: "_id", // Match with the _id in the Course collection
          as: "courseId", // This will add the course data to the "courseId" field (instead of courses)
        },
      },
      {
        $project: {
          // Include all university fields and additional countryName, countryFlag
          uniName: 1, // University name
          uniSymbol: 1, // University symbol
          courseId: 1, // Include the full populated course data in courseId
          scholarshipAvailability: 1,
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          studyLevel: 1,
          uniLocation: 1,
          uniTutionFees: 1,
          uniDiscount: 1,
          uniMainImage: 1,
          uniFeatured: 1,
          uniDuration: 1,
          uniDeadline: 1,
          uniStartDate: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniLibrary: 1,
          uniSports: 1,
          scholarshipAvailability: 1,
          admission_requirements: 1,
          preparatory_year: 1,
          preparatory_year_fees: 1,
          housing_available: 1,
          living_cost: 1,
          studentLifeStyleInUni: 1,
          countryName: 1, // Added countryName field
          countryFlag: 1, // Added countryFlag field from countryPhotos
          countryCode: 1, // Added countryCode field
        },
      },
    ]);

    if (!universityData || universityData.length === 0) {
      return res.status(404).json({ message: "Universities not found" });
    }

    res.status(200).json({
      data: universityData,
      message: "Universities fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllUniversityLikeInsta = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const lastId = req.query.lastId;

    // Cache key based on `limit` & `lastId` to store different requests
    const cacheKey = `university_limit_${limit}_lastId_${lastId || "start"}`;
    const cachedData = cache.get(cacheKey);

    // **If cache exists, return cached data**
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let filter = {};
    if (lastId) {
      filter = { _id: { $gt: lastId } };
    }

    const universities = await universityModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .populate("uniCountry")
      .lean();

    // **Store the last fetched ID**
    const newLastId = universities.length
      ? universities[universities.length - 1]._id
      : null;

    const responseData = {
      data: universities,
      meta: {
        lastId: newLastId,
        hasNextPage: !!newLastId,
      },
    };

    // **Cache the response for future requests**
    cache.set(cacheKey, responseData);

    res.status(200).json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUniversitiesLimitedQuery = async (req, res) => {
  try {
    let { page = 1, limit = 9, search = "", fields = "" } = req.query;

    page = Number.parseInt(page);
    limit = Number.parseInt(limit);

    // Convert comma-separated fields into an object for $project
    let selectedFields = {};
    if (fields) {
      fields.split(",").forEach((field) => (selectedFields[field] = 1));
    } else {
      // Default fields if none are provided
      selectedFields = {
        uniName: 1,
        uniSymbol: 1,
        courseId: 1,
        scholarshipAvailability: 1,
        spokenLanguage: 1, // We'll populate this field
        study_programs: 1, // We'll populate this field
        uniType: 1,
        inTakeMonth: 1,
        inTakeYear: 1,
        entranceExamRequired: 1,
        studyLevel: 1,
        uniLocation: 1,
        uniTutionFees: 1,
        uniDiscount: 1,
        uniMainImage: 1,
        uniDuration: 1,
        uniDeadline: 1,
        uniStartDate: 1,
        uniOverview: 1,
        uniAccomodation: 1,
        uniLibrary: 1,
        uniSports: 1,
        studentLifeStyleInUni: 1,
        countryName: 1,
        countryFlag: 1,
        customURLSlug: 1,
      };
    }

    // First, get all universities with their course IDs
    const universities = await universityModel
      .find({
        $or: [
          { "uniName.en": { $regex: search, $options: "i" } },
          { "uniName.ar": { $regex: search, $options: "i" } },
        ],
      })
      .lean();

    // Get total count for pagination
    const totalCount = universities.length;

    // Process universities in batches for pagination
    const paginatedUniversities = universities.slice(
      (page - 1) * limit,
      page * limit
    );

    // Extract all course IDs from the paginated universities
    const allCourseIds = paginatedUniversities.flatMap(
      (uni) => uni.courseId || []
    );

    // Get language and mode of study data for all courses in one query
    const coursesData = await courseModel.aggregate([
      {
        $match: {
          _id: { $in: allCourseIds },
        },
      },
      {
        $group: {
          _id: "$_id",
          universityId: { $first: "$universityId" },
          languages: { $addToSet: "$Languages" },
          modeOfStudyEn: { $addToSet: "$ModeOfStudy.en" },
          modeOfStudyAr: { $addToSet: "$ModeOfStudy.ar" },
        },
      },
    ]);

    // Create a map of university ID to languages and modes of study
    const universityDataMap = {};

    coursesData.forEach((course) => {
      const uniId = course.universityId ? course.universityId.toString() : null;
      if (!uniId) return;

      if (!universityDataMap[uniId]) {
        universityDataMap[uniId] = {
          languages: [],
          modeOfStudyEn: [],
          modeOfStudyAr: [],
        };
      }

      // Add languages and modes of study to the map
      course.languages.forEach((lang) => {
        if (lang && !universityDataMap[uniId].languages.includes(lang)) {
          universityDataMap[uniId].languages.push(lang);
        }
      });

      course.modeOfStudyEn.forEach((mode) => {
        if (
          mode &&
          mode !== "none" &&
          !universityDataMap[uniId].modeOfStudyEn.includes(mode)
        ) {
          universityDataMap[uniId].modeOfStudyEn.push(mode);
        }
      });

      course.modeOfStudyAr.forEach((mode) => {
        if (
          mode &&
          mode !== "none" &&
          !universityDataMap[uniId].modeOfStudyAr.includes(mode)
        ) {
          universityDataMap[uniId].modeOfStudyAr.push(mode);
        }
      });
    });

    // Aggregation pipeline for fetching data with country information
    const universityData = await universityModel.aggregate([
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: search, $options: "i" } },
            { "uniName.ar": { $regex: search, $options: "i" } },
          ],
        },
      },
      { $skip: (page - 1) * limit }, // Pagination: Skip documents
      { $limit: limit }, // Pagination: Limit documents
      {
        $lookup: {
          from: "countries",
          localField: "uniCountry",
          foreignField: "_id",
          as: "country",
        },
      },
      { $unwind: { path: "$country", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          countryName: { $ifNull: ["$country.countryName", {}] },
          countryFlag: { $ifNull: ["$country.countryPhotos.countryFlag", ""] },
          countryCode: { $ifNull: ["$country.countryCode", ""] },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseId",
        },
      },
      { $project: selectedFields }, // Dynamically select fields
    ]);

    if (!universityData.length) {
      return res.status(404).json({ message: "Universities not found" });
    }

    // Add spoken languages and study programs to each university
    const enrichedUniversityData = universityData.map((uni) => {
      const uniId = uni._id.toString();
      const uniData = universityDataMap[uniId] || {
        languages: [],
        modeOfStudyEn: [],
        modeOfStudyAr: [],
      };

      return {
        ...uni,
        spokenLanguage: uniData.languages || [],
        study_programs: {
          en: uniData.modeOfStudyEn || [],
          ar: uniData.modeOfStudyAr || [],
        },
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: enrichedUniversityData,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
      message: "Universities fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a University by ID
const updateUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const { uniCountry, courseId, major, ...universityDetails } = req.body;

    // First, get the current university to check its current country
    const currentUniversity = await universityModel.findById(id).lean();

    if (!currentUniversity) {
      return res.status(404).json({ message: "University not found" });
    }

    // Step 1: Find and update the university
    const updatedUniversity = await universityModel
      .findByIdAndUpdate(
        id,
        { ...universityDetails, courseId, uniCountry, major },
        { new: true }
      )
      .lean();

    await createNotification(
      "University",
      updatedUniversity,
      "uniName",
      "updated"
    );

    // Step 2: Handle country relationships
    if (uniCountry) {
      // If the university was previously associated with a different country,
      // remove it from that country
      if (
        currentUniversity.uniCountry &&
        currentUniversity.uniCountry.toString() !== uniCountry.toString()
      ) {
        await countryModel.findByIdAndUpdate(currentUniversity.uniCountry, {
          $pull: { universities: id },
        });
      }

      // Add the university to the new country
      await countryModel.findByIdAndUpdate(
        uniCountry,
        { $addToSet: { universities: updatedUniversity._id } },
        { new: true }
      );
    }

    if (courseId) {
      await courseModel.updateMany(
        { university: id, _id: { $nin: courseId } },
        { $unset: { university: "" } }
      );
    }

    if (major) {
      // First, remove university reference from all majors that reference this university
      await MajorsModel.updateMany(
        { university: id },
        { $unset: { university: "" } }
      );

      // Then, set university reference for the majors in the provided array
      if (major.length > 0) {
        await MajorsModel.updateMany(
          { _id: { $in: major } },
          { $set: { university: id } }
        );
      }
    } else {
      // If no major array is provided, remove university reference from all majors
      // that reference this university
      await MajorsModel.updateMany(
        { university: id },
        { $unset: { university: "" } }
      );
    }

    const clearCache = true;
    res.status(200).json({
      data: updatedUniversity,
      message: "University updated successfully and linked to country!",
      clearCache,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a University by ID

const deleteUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find and delete the university
    const deletedUniversity = await universityModel.findByIdAndDelete(id);
    if (!deletedUniversity) {
      return res.status(404).json({ message: "University not found" });
    }

    await createNotification(
      "University",
      deletedUniversity,
      "uniName",
      "deleted"
    );

    // Step 2: Remove the university reference from the country model
    await countryModel.updateMany(
      { universities: id },
      { $pull: { universities: id } }
    );

    await MajorsModel.updateMany(
      { university: id },
      { $unset: { university: "" } }
    );

    res.status(200).json({
      message: "University deleted successfully and removed from country!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createUniversity,
  getUniversityById,
  getUniversityByName,
  getAllUniversities,
  getUniversitiesLimitedQuery,
  getAllUniversityLikeInsta,
  updateUniversity,
  deleteUniversity,
};
