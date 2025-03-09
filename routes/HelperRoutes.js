const helperController = require("../controllers/HelperController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.get("/", helperController.getAllDropdownData);
router.get("/notification", helperController.getAllNotification);
router.put("/notification/all", helperController.updateAllNotification);

module.exports = router;
