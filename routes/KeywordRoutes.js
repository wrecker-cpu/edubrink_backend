const keyController = require("../controllers/KeyWordController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.get("/", keyController.getKeywords);

module.exports = router;
