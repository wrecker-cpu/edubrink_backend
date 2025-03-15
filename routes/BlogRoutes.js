const blogController = require("../controllers/BlogController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post(
  "/",
  auth.protect,
  auth.restrictToEditorAndAdmin,
  blogController.createBlog
);
router.get("/name/:name", auth.protect, blogController.getBlogByName);
router.put(
  "/:id",
  auth.protect,
  auth.restrictToEditorAndAdmin,
  blogController.updateBlog
);
router.get("/getAll/User/Insta", blogController.getAllBlogLikeInsta);
router.get("/:id", auth.protect, blogController.getBlogById);
router.get("/", blogController.getAllBlog);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  blogController.deleteBlog
);

module.exports = router;
