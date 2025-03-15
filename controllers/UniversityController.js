const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 310 });
const universityModel = require("../models/UniversityModel");
const countryModel = require("../models/CountryModel");
const courseModel = require("../models/CourseModel");
const FacultyModel = require("../models/FacultyModel");
const { createNotification } = require("../controllers/HelperController");

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
      .populate("courseId faculty uniCountry");
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ data: universityData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUniversityByName = async (req, res) => {
  const name = req.params.name; // Get university name from route parameters

  try {
    const universityData = await universityModel.aggregate([
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: name, $options: "i" } }, // Case-insensitive search in English name
            { "uniName.ar": { $regex: name, $options: "i" } }, // Case-insensitive search in Arabic name
            { "customURLSlug.en": { $regex: name, $options: "i" } },
            { "customURLSlug.ar": { $regex: name, $options: "i" } },
          ],
        },
      },
      // Lookup country data using `uniCountry` field
      {
        $lookup: {
          from: "countries", // The countries collection
          localField: "uniCountry", // The `uniCountry` field in University model
          foreignField: "_id", // Match with `_id` in Country collection
          as: "country", // This will store country data in the "country" array
        },
      },
      {
        $unwind: {
          path: "$country",
          preserveNullAndEmptyArrays: true, // Keep universities without a country
        },
      },
      {
        $addFields: {
          countryName: {
            $ifNull: ["$country.countryName", ""], // Default to empty string if missing
          },
          countryFlag: {
            $ifNull: ["$country.countryPhotos.countryFlag", ""],
          },
          countryCode: {
            $ifNull: ["$country.countryCode", ""], // Default to empty string if countryFlag is missing
          },
        },
      },
      // Lookup courses related to the university
      {
        $lookup: {
          from: "courses", // The courses collection
          localField: "courseId", // The field in University model containing course IDs
          foreignField: "_id", // Match with Course _id
          as: "courses", // Store populated courses in "courses"
        },
      },
      {
        $lookup: {
          from: "faculties", // The courses collection
          localField: "faculty", // The field in University model containing course IDs
          foreignField: "_id", // Match with Course _id
          as: "faculties", // Store populated courses in "courses"
        },
      },
      {
        $project: {
          uniName: 1, // University name
          uniSymbol: 1, // University logo
          courses: 1, // Populated courses (now including Tags)
          scholarshipAvailability: 1,
          uniDiscount: 1,
          uniMainImage: 1,
          courses: 1,
          faculties: 1,
          campuses: 1,
          uniDeadline: 1,
          uniDuration: 1,
          uniStartDate: 1,
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          studyLevel: 1,
          uniLocation: 1,
          uniTutionFees: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniLibrary: 1,
          uniSports: 1,
          studentLifeStyleInUni: 1,
          countryName: 1,
          countryFlag: 1,
          countryCode: 1,
          seo: 1,
        },
      },
    ]);

    if (!universityData || universityData.length === 0) {
      return res.status(404).json({ message: "University not found" });
    }

    res.status(200).json({
      data: universityData[0], // Since we're searching by name, return the first match
      message: "University fetched successfully",
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

    page = parseInt(page);
    limit = parseInt(limit);

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

    // Aggregation pipeline
    const universityData = await universityModel.aggregate([
      {
        $lookup: {
          from: "countries",
          localField: "_id",
          foreignField: "universities",
          as: "country",
        },
      },
      { $unwind: { path: "$country", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          countryName: { $ifNull: ["$country.countryName", {}] },
          countryFlag: { $ifNull: ["$country.countryPhotos.countryFlag", ""] },
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
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: search, $options: "i" } },
            { "countryName.en": { $regex: search, $options: "i" } },
          ],
        },
      },
      { $project: selectedFields }, // ✅ Dynamically select fields
      { $skip: (page - 1) * limit }, // Pagination
      { $limit: limit }, // Pagination
    ]);

    if (!universityData.length) {
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

// Update a University by ID
const updateUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const { uniCountry, courseId, faculty, ...universityDetails } = req.body;

    // Step 1: Find and update the university
    const updatedUniversity = await universityModel
      .findByIdAndUpdate(
        id,
        { ...universityDetails, courseId, faculty, uniCountry },
        { new: true }
      )
      .lean();

    if (!updatedUniversity) {
      return res.status(404).json({ message: "University not found" });
    }

    await createNotification(
      "University",
      updatedUniversity,
      "uniName",
      "updated"
    );

    // Step 2: If uniCountry is provided, update the Country model
    if (uniCountry) {
      await countryModel.findByIdAndUpdate(
        uniCountry,
        { $addToSet: { universities: updatedUniversity._id } },
        { new: true }
      );
    }

    if (faculty) {
      await FacultyModel.updateMany(
        { universities: id, _id: { $nin: faculty } },
        { $unset: { universities: "" } }
      );
    }

    if (courseId) {
      await courseModel.updateMany(
        { university: id, _id: { $nin: courseId } },
        { $unset: { university: "" } }
      );
    }

    res.status(200).json({
      data: updatedUniversity,
      message: "University updated successfully and linked to country!",
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

    await FacultyModel.updateMany(
      { universities: id },
      { $pull: { universities: id } } // Correctly removes the university ID from the array
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
