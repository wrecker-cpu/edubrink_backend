const helperController = require("../controllers/HelperController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.get("/", helperController.getAllDropdownData);

module.exports = router;
