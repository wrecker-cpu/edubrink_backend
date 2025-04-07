const searchController = require("../controllers/SearchController");
const router = require("express").Router();

router.get("/", searchController.getCountries);
router.get("/university", searchController.getUniversitiesByCountries);
router.get("/blog", searchController.getBlogsByCountries);
router.get("/major", searchController.getMajorsByUniversities);

module.exports = router;
