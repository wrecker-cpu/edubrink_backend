const userController = require("../controllers/UserController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// User creation route
router.post("/", userController.createUser);
router.post("/verifyotp", userController.verifyOtp);
router.post("/resendotp", userController.resendOtp);
// Route for getting all users (admin-protected)
router.get("/", auth.protect, auth.restrictToEditorAndAdmin, userController.getAllUser);
router.post("/admin/", auth.protect, auth.restrictToAdmin, userController.createUserByAdmin);
router.get("/admin/", auth.protect, auth.restrictToEditorAndAdmin, userController.getAllUserByAdmin);
router.put("/admin/:id", auth.protect, auth.restrictToAdmin, userController.updateUserByAdmin);
router.get("/admin/:id", auth.protect, userController.getUserAdminbyID);

// Route for getting, updating, and deleting a user by ID
router.get("/data/:id", auth.protect, userController.getUserbyID);
router.put("/:id", userController.updateUser);
router.put("/all/updateAll", userController.updateAllUsers);
router.delete("/:id",auth.protect, auth.restrictToAdmin, userController.deleteUser);

// User login route
router.post("/login", userController.loginUser);

module.exports = router;
