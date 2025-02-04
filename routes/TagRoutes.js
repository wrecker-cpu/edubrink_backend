const tagController = require("../controllers/TagController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", tagController.createTag);
router.post("/batch", tagController.createBatchTags);
router.put("/:id", tagController.updateTag);
router.get("/:id", tagController.getTagById);
router.get("/", tagController.getAllTag);
router.delete("/:id", tagController.deleteTag);

module.exports = router;
