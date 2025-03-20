const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 310 });
const courseModel = require("../models/CourseModel");
const universityModel = require("../models/UniversityModel");
const mongoose = require("mongoose");
const { createNotification } = require("../controllers/HelperController");

const createCourse = async (req, res) => {
  try {
    const { university, ...courseDetails } = req.body;

    // Create the course
    const newCourse = new courseModel(courseDetails);
    await newCourse.save();

    await createNotification("Course", newCourse, "CourseName", "created");

    // Add course ID to the university model
    if (university) {
      await universityModel.findByIdAndUpdate(
        university,
        { $push: { courseId: newCourse._id } },
        { new: true }
      );
    }

    res.status(201).json({
      data: newCourse,
      message: "Course created successfully and linked to university!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCourseById = async (req, res) => {
  const { id, name } = req.params; // Destructure both 'id' and 'name'

  try {
    let matchCondition = {};

    // Check if id is a valid ObjectId, if so, match by ID
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      matchCondition = { _id: new mongoose.Types.ObjectId(id) }; // Match by ID
    }
    // If 'id' is not valid, try matching by course name
    else if (name) {
      matchCondition = {
        $or: [
          { "CourseName.en": name },
          { "CourseName.ar": name },
          { "customURLSlug.en": name },
          { "customURLSlug.ar": name },
        ], // Compare both English & Arabic
      };
    } else {
      return res
        .status(400)
        .json({ message: "Provide either a valid ID or a course name" });
    }

    // Find course and populate university field
    const courseData = await courseModel
      .findOne(matchCondition)
      .populate("university", "uniName uniSymbol");

    if (!courseData) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ data: courseData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const {
      all,
      page,
      limit,
      search,
      mostPopular,
      scholarships,
      discount,
      duration,
      durationUnit,
    } = req.query;

    // Check if the `all` query parameter is set to true
    if (all === "true") {
      // Fetch all courses without pagination
      const courses = await courseModel.find().populate("university").lean();
      return res.status(200).json({ data: courses });
    }

    // Default pagination behavior
    const parsedLimit = parseInt(limit) || 10; // Default to 10 items per page
    const parsedPage = parseInt(page) || 1; // Default to the first page
    const skip = (parsedPage - 1) * parsedLimit; // Calculate how many items to skip

    // Build the query for filtering
    const query = {};
    if (search) {
      // Add search condition to the query for `courseName.en`
      query.$or = [{ "CourseName.en": { $regex: search, $options: "i" } }];

      // If searching in `university.uniName.en`, fetch matching universities first
      const matchingUniversities = await universityModel.find(
        { "uniName.en": { $regex: search, $options: "i" } },
        { _id: 1 } // Only fetch the `_id` field
      );

      // Extract the `_id`s of matching universities
      const universityIds = matchingUniversities.map((uni) => uni._id);

      // Add the matching university IDs to the query
      if (universityIds.length > 0) {
        query.$or.push({ university: { $in: universityIds } });
      }
    }

    if (mostPopular === "true") {
      query.MostPopular = true;
    }
    if (scholarships === "true") {
      query.scholarshipsAvailable = true;
    }
    if (discount === "true") {
      query.DiscountAvailable = true;
    }

    if (duration && durationUnit) {
      const parsedDuration = parseFloat(duration); // Convert duration to a number
      if (!isNaN(parsedDuration)) {
        query.CourseDuration = parsedDuration;
        query.CourseDurationUnits = durationUnit;
      }
    }

    // Fetch courses with pagination, filtering, and populate the `university` field
    const courses = await courseModel
      .find(query) // Apply the search filter
      .populate("university")
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Get the total count of courses for pagination metadata (with the same filter)
    const totalCount = await courseModel.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.status(200).json({
      data: courses,
      pagination: {
        totalCount, // Total number of courses
        totalPages, // Total number of pages
        currentPage: parsedPage, // Current page
        limit: parsedLimit, // Number of courses per page
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCoursesLikeInsta = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const lastId = req.query.lastId;

    // Parse filterProp from query
    let filterProp = {};
    if (req.query.filterProp) {
      try {
        filterProp = JSON.parse(req.query.filterProp); // Parse directly
      } catch (error) {
        console.error("Error parsing filterProp:", error.message);
      }
    }

    let filter = {};
    if (lastId) {
      filter._id = { $gt: lastId };
    }

    // Apply filter logic from filterProp
    if (filterProp.minBudget || filterProp.maxBudget) {
      filter.CourseFees = {
        $gte: Number(filterProp.minBudget) || 0,
        $lte: Number(filterProp.maxBudget) || Infinity,
      };
    }
    if (filterProp["ModeOfStudy"]) {
      filter.$or = [
        { "ModeOfStudy.en": filterProp["ModeOfStudy"] },
        { "ModeOfStudy.ar": filterProp["ModeOfStudy"] },
      ];
    }
    if (
      (filterProp["searchQuery.en"] &&
        filterProp["searchQuery.en"].trim() !== "") ||
      (filterProp["searchQuery.ar"] &&
        filterProp["searchQuery.ar"].trim() !== "")
    ) {
      filter.$or = [];

      if (
        filterProp["searchQuery.en"] &&
        filterProp["searchQuery.en"].trim() !== ""
      ) {
        filter.$or.push({
          "Tags.en": { $in: [filterProp["searchQuery.en"]] },
        });
      }

      if (
        filterProp["searchQuery.ar"] &&
        filterProp["searchQuery.ar"].trim() !== ""
      ) {
        filter.$or.push({
          "Tags.ar": { $in: [filterProp["searchQuery.ar"]] },
        });
      }
    }
    if (filterProp.CourseDuration) {
      let [min, max] = filterProp.CourseDuration.split("-").map(Number);
      if (max === undefined) {
        max = Infinity;
      }

      // Convert all durations to months before filtering
      filter.$or = [
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
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .populate("university")
      .lean();

    // Store the last fetched ID
    const newLastId = courses.length ? courses[courses.length - 1]._id : null;

    res.status(200).json({
      data: courses,
      meta: {
        lastId: newLastId,
        hasNextPage: !!newLastId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCoursesWithUniNames = async (req, res) => {
  try {
    // Dynamically get `page` and `limit` from query parameters
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 5; // Default to 5 items per page

    const courses = await courseModel.aggregate([
      // Step 1: Lookup the university information
      {
        $lookup: {
          from: "universities", // University collection
          localField: "university",
          foreignField: "_id", // Reference field in university model
          as: "university", // The result will be stored in the "university" field
        },
      },
      {
        $unwind: {
          path: "$university", // Unwind to flatten the university data
          preserveNullAndEmptyArrays: true, // Keep courses without university
        },
      },
      // Step 2: Lookup the country information via the country's universities field
      {
        $lookup: {
          from: "countries", // Country collection
          localField: "university._id", // Use university._id (the ID of the university)
          foreignField: "universities", // Match with universities field in country schema
          as: "country", // The result will be stored in the "country" field
        },
      },
      {
        $unwind: {
          path: "$country", // Unwind to flatten the country data
          preserveNullAndEmptyArrays: true, // Keep university data even if no country
        },
      },
      // Step 3: Project the desired fields
      {
        $project: {
          CourseName: 1,
          CourseDescription: 1,
          CourseDuration: 1,
          DeadLine: 1,
          CourseFees: 1,
          ModeOfStudy: 1,
          Requirements: 1,
          seo: 1,
          customURLSlug: 1,
          uniName: "$university.uniName", // Extract university name
          uniSymbol: "$university.uniSymbol", // Extract university symbol
          countryNameEn: "$country.countryName.en", // Extract English country name
          countryNameAr: "$country.countryName.ar", // Extract Arabic country name
        },
      },
      // Step 4: Skip and Limit for Pagination
      {
        $skip: (page - 1) * limit, // Skip documents for previous pages
      },
      {
        $limit: limit, // Limit documents for the current page
      },
    ]);

    // Count total documents for pagination metadata
    const totalDocuments = await courseModel.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      data: courses,
      pagination: {
        totalDocuments,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// const getcourseByName = async (req, res) => {
//   const name = req.params.name; // Assume 'name' is passed as a route parameter
//   try {
//     // Find the course by name
//     const courseData = await courseModel
//       .findOne({ "courseName": name })
//       .lean();

//     if (!courseData) {
//       return res.status(404).json({ message: "course not found" });
//     }
//     res.status(200).json({ data: courseData });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// Update a course by ID

const updateCourse = async (req, res) => {
  const id = req.params.id;
  try {
    const { university, ...courseDetails } = req.body;

    // Find the existing course before updating
    const existingCourse = await courseModel.findById(id);
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Include the university field in the update operation
    const updatedCourse = await courseModel
      .findByIdAndUpdate(id, { ...courseDetails, university }, { new: true })
      .lean();

    await createNotification("Course", updatedCourse, "CourseName", "updated");

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // If university ID has changed or was removed, update references
    if (
      existingCourse.university &&
      existingCourse.university.toString() !== university
    ) {
      // Remove course ID from the old university
      await universityModel.findByIdAndUpdate(existingCourse.university, {
        $pull: { courseId: id },
      });
    }

    // Add course ID to the new university (if universityId is provided)
    if (university) {
      await universityModel.findByIdAndUpdate(university, {
        $addToSet: { courseId: updatedCourse._id },
      });
    }

    res.status(200).json({
      data: updatedCourse,
      message: "Course updated successfully and university reference updated!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a course by ID
const deleteCourse = async (req, res) => {
  const id = req.params.id;
  try {
    // Find and delete the course
    const deletedCourse = await courseModel.findByIdAndDelete(id);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    await createNotification("Course", deletedCourse, "CourseName", "deleted");

    // Remove course ID from the university model
    await universityModel.updateMany(
      { courseId: id },
      { $pull: { courseId: id } }
    );

    res.status(200).json({
      message: "Course deleted successfully and removed from universities!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCourse,
  getCourseById,
  getAllCourses,
  updateCourse,
  deleteCourse,
  getAllCoursesLikeInsta,
  getAllCoursesWithUniNames,
  //   getCourseByName,
};
