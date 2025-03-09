const FacultyController = require("../controllers/FacultyController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post(
  "/",
  auth.protect,
  auth.restrictToAdmin,
  FacultyController.createFaculty
);
router.put("/:id", FacultyController.updateFaculty);
router.get("/:id", FacultyController.getFacultyById);
router.get("/name/getUniNames", FacultyController.getAllFacultyWithUniNames);
router.get("/", FacultyController.getAllFaculty);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  FacultyController.deleteFaculty
);

module.exports = router;
