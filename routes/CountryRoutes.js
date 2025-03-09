const countryController = require("../controllers/CountryController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// Route for getting, updating, and deleting a user by ID
router.post(
  "/",
  auth.protect,
  auth.restrictToAdmin,
  countryController.createCountry
);
router.get("/name/:name", countryController.getCountryByName);
router.get("/fields/query", countryController.getAllCountriesByQuery);
router.put("/all/updateAll", countryController.updateAllCountries);
router.get("/getAll/DepthData", countryController.getFullDepthData);
router.put("/:id", countryController.updateCountry);
router.get("/:id", countryController.getCountryById);
router.get("/", countryController.getAllCountries);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  countryController.deleteCountry
);

module.exports = router;
