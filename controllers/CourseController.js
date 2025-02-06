const courseModel = require("../models/CourseModel");
const mongoose = require("mongoose");

const createCourse = async (req, res) => {
  try {
    const courseData = new courseModel(req.body);
    await courseData.save();
    res
      .status(201)
      .json({ data: courseData, message: "course created successfully" });
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
      matchCondition = { "CourseName.en": name }; // Match by course name (in English)
    } else {
      return res
        .status(400)
        .json({ message: "Provide either a valid ID or a course name" });
    }

    const courseData = await courseModel.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "universities",
          localField: "_id",
          foreignField: "courseId",
          as: "university",
        },
      },
      { $unwind: { path: "$university", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          CourseName: 1,
          CourseDescription: 1,
          CourseDuration: 1,
          DeadLine: 1,
          CourseFees: 1,
          ModeOfStudy: 1,
          Requirements: 1,
          uniName: "$university.uniName",
          uniSymbol: "$university.uniSymbol",
        },
      },
    ]);

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ data: courseData[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    // Check if the `all` query parameter is set to true
    if (req.query.all === "true") {
      // Fetch all courses without limit or skip
      const courses = await courseModel.find().populate("Tags").lean();
      return res.status(200).json({ data: courses });
    }

    // Default pagination behavior
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const page = parseInt(req.query.page) || 1; // Default to the first page
    const skip = (page - 1) * limit; // Calculate how many items to skip

    const courses = await courseModel
      .find()
      .populate("Tags")
      .skip(skip)
      .limit(limit)
      .lean();
    const totalCount = await courseModel.countDocuments();

    res.status(200).json({
      data: courses,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
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
          localField: "_id", // Match on _id in courseModel
          foreignField: "courseId", // Reference field in university model
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
    const courseData = await courseModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!courseData) {
      return res.status(404).json({ message: "course not found" });
    }
    res
      .status(200)
      .json({ data: courseData, message: "course updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a course by ID
const deleteCourse = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedcourse = await courseModel.findByIdAndDelete(id);
    if (!deletedcourse) {
      return res.status(404).json({ message: "course not found" });
    }
    res.status(200).json({ message: "course deleted successfully" });
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
  getAllCoursesWithUniNames,
  //   getCourseByName,
};
