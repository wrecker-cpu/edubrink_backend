const blogController = require("../controllers/BlogController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", blogController.createBlog);
router.get("/name/:name", blogController.getBlogByName);
router.put("/:id", blogController.updateBlog);
router.get("/:id", blogController.getBlogById);
router.get("/", blogController.getAllBlog);
router.delete("/:id", blogController.deleteBlog);

module.exports = router;
