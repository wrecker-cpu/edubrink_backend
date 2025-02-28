const universityController = require("../controllers/UniversityController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", universityController.createUniversity);
router.put("/:id", universityController.updateUniversity);
router.get("/name/:name", universityController.getUniversityByName);
router.get("/fields/query", universityController.getUniversitiesLimitedQuery);
router.get("/:id", universityController.getUniversityById);
router.get("/", universityController.getAllUniversities);
router.delete("/:id", universityController.deleteUniversity);

module.exports = router;
