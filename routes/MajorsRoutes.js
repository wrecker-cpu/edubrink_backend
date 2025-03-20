const MajorsController = require("../controllers/MajorsController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post(
  "/",
  auth.protect,
  auth.restrictToAdmin,
  MajorsController.createMajors
);
router.put("/:id", MajorsController.updateMajors);
router.get("/:id", MajorsController.getMajorsById);
router.get("/name/:name", auth.protect, MajorsController.getMajorsByName);
router.get("/", MajorsController.getAllMajors);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  MajorsController.deleteMajors
);

module.exports = router;
