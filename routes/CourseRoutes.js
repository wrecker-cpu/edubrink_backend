const courseController = require("../controllers/CourseController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", courseController.createCourse);
// router.get("/name/:name", courseController.getCourseByName);
router.put("/:id", courseController.updateCourse);
router.get("/getAll/GetAllCourse", courseController.getAllCoursesWithUniNames);
router.get("/:id", courseController.getCourseById);
router.get("/:id", courseController.getCourseById);
router.get("/name/:name", courseController.getCourseById);
router.get("/", courseController.getAllCourses);
router.delete("/:id", courseController.deleteCourse);

module.exports = router;
