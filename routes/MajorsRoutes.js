const MajorsController = require("../controllers/MajorsController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", MajorsController.createMajors);
router.put("/:id", MajorsController.updateMajors);
router.get("/:id", MajorsController.getMajorsById);
router.get("/", MajorsController.getAllMajors);
router.delete("/:id", MajorsController.deleteMajors);

module.exports = router;
