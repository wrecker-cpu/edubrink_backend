const courseModel = require("../models/CourseModel");
const universityModel = require("../models/UniversityModel");
const mongoose = require("mongoose");

// Create a new course
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

// Read (Get) a course by ID
const getCourseById = async (req, res) => {
  const id = req.params.id;
  try {
    const courseData = await courseModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }, // Match the course by ID
      },
      {
        $lookup: {
          from: "universities", // Name of the University collection
          localField: "_id", // Field in Course to match
          foreignField: "courseId", // Field in University to match
          as: "university", // Output array
        },
      },
      {
        $unwind: {
          path: "$university",
          preserveNullAndEmptyArrays: true, // Keep courses without a university
        },
      },
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
        },
      },
    ]);

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ data: courseData[0] }); // Send the first matching result
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    // Check if the `all` query parameter is set to true
    if (req.query.all === "true") {
      // Fetch all courses without limit or skip
      const courses = await courseModel.find().lean();
      return res.status(200).json({ data: courses });
    }

    // Default pagination behavior
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const page = parseInt(req.query.page) || 1; // Default to the first page
    const skip = (page - 1) * limit; // Calculate how many items to skip

    const courses = await courseModel.find().skip(skip).limit(limit).lean();
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
    const limit = parseInt(req.query.limit) || 5; // Default to 10 items per page

    const courses = await courseModel.aggregate([
      {
        $lookup: {
          from: "universities", // Name of the University collection
          localField: "_id", // Field in Course to match
          foreignField: "courseId", // Field in University to match
          as: "university", // Output array
        },
      },
      {
        $unwind: {
          path: "$university",
          preserveNullAndEmptyArrays: true, // Keep courses without a university
        },
      },
      {
        $project: {
          CourseName: 1,
          CourseDescription: 1,
          CourseDuration: 1,
          DeadLine: 1,
          CourseFees: 1,
          ModeOfStudy: 1,
          Requirements: 1,
          uniName: "$university.uniName", // Extract uniName
          uniSymbol: "$university.uniSymbol", // Extract university symbol
        },
      },
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
