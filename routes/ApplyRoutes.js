const ApplyController = require("../controllers/ApplyController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", ApplyController.createApply);
router.put("/:id", ApplyController.updateApply);
router.get("/:id", ApplyController.getApplyById);
router.get("/", ApplyController.getAllApply);
router.delete("/:id", ApplyController.deleteApply);

module.exports = router;
