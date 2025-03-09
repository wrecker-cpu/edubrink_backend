const universityController = require("../controllers/UniversityController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post(
  "/",
  auth.protect,
  auth.restrictToAdmin,
  universityController.createUniversity
);
router.put(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  universityController.updateUniversity
);
router.get(
  "/name/:name",
  auth.protect,
  universityController.getUniversityByName
);
router.get(
  "/fields/query",
  auth.protect,
  universityController.getUniversitiesLimitedQuery
);
router.get("/:id", auth.protect, universityController.getUniversityById);
router.get("/", auth.protect, universityController.getAllUniversities);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  universityController.deleteUniversity
);

module.exports = router;
