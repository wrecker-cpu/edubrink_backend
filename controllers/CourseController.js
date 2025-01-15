const courseModel = require("../models/CourseModel");

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
    // Find the course and populate the 'universities' field
    const courseData = await courseModel
      .findById(id)
      .populate("universities")
      .lean();
    if (!courseData) {
      return res.status(404).json({ message: "course not found" });
    }
    res.status(200).json({ data: courseData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await courseModel.find().lean();
    res.status(200).json({ data: courses });
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
//   getCourseByName,
};
