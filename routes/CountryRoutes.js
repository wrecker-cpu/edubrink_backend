const countryController = require("../controllers/CountryController");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post("/", countryController.createCountry);
router.get("/name/:name", countryController.getCountryByName);
router.put("/:id", countryController.updateCountry);
router.get("/:id", countryController.getCountryById);
router.get("/", countryController.getAllCountries);
router.delete("/:id", countryController.deleteCountry);

module.exports = router;
