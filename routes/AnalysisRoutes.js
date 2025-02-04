const analysisController = require("../controllers/AnalysisController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", analysisController.createAnalysis);
router.post("/batch", analysisController.createAnalysisBatch);
router.put("/:id", analysisController.updateAnalysis);
router.get("/:id", analysisController.getAnalysisById);
router.get("/", analysisController.getAllAnalysis);
router.delete("/:id", analysisController.deleteAnalysis);

module.exports = router;
