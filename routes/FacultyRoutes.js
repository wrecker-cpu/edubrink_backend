const FacultyController = require("../controllers/FacultyController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", FacultyController.createFaculty);
router.put("/:id", FacultyController.updateFaculty);
router.get("/:id", FacultyController.getFacultyById);
router.get("/", FacultyController.getAllFaculty);
router.delete("/:id", FacultyController.deleteFaculty);

module.exports = router;
