const zlib = require("zlib");
const { Readable } = require("stream");
const NodeCache = require("node-cache");
const countryModel = require("../models/CountryModel");
const universityModel = require("../models/UniversityModel");
const BlogModel = require("../models/BlogModel");
const { createNotification } = require("../controllers/HelperController");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 }); // 5 min TTL

const clearCountryCache = () => {
  const keys = cache.keys(); // Get all cached keys
  keys.forEach((key) => {
    if (key.startsWith("countries_")) {
      cache.del(key); // Delete only country-related caches
    }
  });
};

// Create a new country
const createCountry = async (req, res) => {
  try {
    const countryData = new countryModel(req.body);
    await countryData.save();
    await createNotification("Country", countryData, "countryName", "created");

    clearCountryCache();
    res
      .status(201)
      .json({ data: countryData, message: "Country created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a country by ID
const getCountryById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the country and populate the 'universities' field
    const countryData = await countryModel
      .findById(id)
      .populate("universities blog faculty")
      .lean();
    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ data: countryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await countryModel
      .find()
      .populate({
        path: "universities",
        select: "courseId uniName scholarshipAvailability uniTutionFees",
        populate: {
          path: "courseId",
          model: "Course",
          match: { _id: { $ne: null } }, // Ensures only non-null IDs are used
          select: "CourseName DeadLine CourseFees", // Include only specific fields
        },
      })
      .populate({
        path: "blog",
        select: "blogTitle blogSubtitle blogAdded",
      })
      .lean();
    res.status(200).json({ data: countries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// const getAllCountriesByQuery = async (req, res) => {
//   try {
//     const { fields, populate } = req.query;

//     // Convert fields into a space-separated string for Mongoose `.select()`
//     const selectedFields = fields ? fields.split(",").join(" ") : "";

//     // Base query
//     let query = countryModel.find().select(selectedFields);

//     // Conditionally populate based on query parameters
//     if (populate) {
//       const populateFields = populate.split(",");

//       if (populateFields.includes("universities")) {
//         query = query.populate({
//           path: "universities",
//           select: "courseId uniName scholarshipAvailability uniTutionFees",
//           populate: {
//             path: "courseId",
//             model: "Course",
//             match: { _id: { $ne: null } },
//             select: "CourseName DeadLine CourseFees",
//           },
//         });
//       }

//       if (populateFields.includes("blog")) {
//         query = query.populate({
//           path: "blog",
//           select: "blogTitle blogSubtitle blogAdded",
//         });
//       }
//     }

//     const countries = await query.lean();
//     res.status(200).json({ data: countries });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const getAllCountriesByQuery = async (req, res) => {
  try {
    const { fields, populate } = req.query;

    // Generate cache key
    const cacheKey = `countries_${fields || "all"}_${populate || "none"}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ data: cachedData, cached: true });
    }

    // Query database
    const selectedFields = fields ? fields.split(",").join(" ") : "";
    let query = countryModel.find().select(selectedFields);

    if (populate) {
      const populateFields = populate.split(",");

      if (populateFields.includes("universities")) {
        query = query.populate({
          path: "universities",
          select: "courseId uniName scholarshipAvailability uniTutionFees",
          populate: {
            path: "courseId",
            model: "Course",
            match: { _id: { $ne: null } },
            select: "CourseName DeadLine CourseFees",
          },
        });
      }

      if (populateFields.includes("blog")) {
        query = query.populate({
          path: "blog",
          select: "blogTitle blogSubtitle blogAdded",
        });
      }
    }

    const countries = await query.lean();

    // Store in cache
    cache.set(cacheKey, countries, 300);

    res.status(200).json({ data: countries, cached: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCountryByName = async (req, res) => {
  const name = req.params.name; // Assume 'name' is passed as a route parameter
  try {
    // Find the country by name
    const countryData = await countryModel
      .findOne({ "countryName.en": name })
      .populate({
        path: "universities",
        select: "courseId uniName scholarshipAvailability uniTutionFees",
        populate: {
          path: "courseId",
          model: "Course",
          match: { _id: { $ne: null } }, // Ensures only non-null IDs are used
          select: "CourseName DeadLine CourseFees", // Include only specific fields
        },
      })
      .populate({
        path: "blog",
        select: "blogTitle blogSubtitle blogAdded",
      })
      .lean();

    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ data: countryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFullDepthData = async (req, res) => {
  try {
    const result = await countryModel.aggregate([
      {
        $lookup: {
          from: "universities", // Lookup universities based on IDs in the universities array
          localField: "universities",
          foreignField: "_id",
          as: "universities",
        },
      },
      {
        $unwind: {
          path: "$universities",
          preserveNullAndEmptyArrays: true, // Preserve countries without universities
        },
      },
      {
        $lookup: {
          from: "courses", // Lookup courses based on IDs in the courseId array
          localField: "universities.courseId",
          foreignField: "_id",
          as: "universities.courseId",
          pipeline: [
            {
              $project: {
                CourseName: 1,
                CourseDescription: 1,
                CourseDuration: 1,
                CourseStartDate: 1,
                DeadLine: 1,
                CourseFees: 1,
                ModeOfStudy: 1,
                Requirements: 1,
                Tags: 1, // Include Tags field from the tags lookup
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$_id", // Group back by country
          countryName: { $first: "$countryName" },
          countryPhotos: { $first: "$countryPhotos" },
          countryCode: { $first: "$countryCode" },
          countryStudentPopulation: { $first: "$countryStudentPopulation" },
          countryCurrency: { $first: "$countryCurrency" },
          countryLanguages: { $first: "$countryLanguages" },
          universities: { $push: "$universities" }, // Recreate the universities array
          blog: { $first: "$blog" }, // Include blog field for lookup
        },
      },
      {
        $lookup: {
          from: "blogs", // Populate blogs using the blogs IDs
          localField: "blog", // Local field in the country collection
          foreignField: "_id", // Match with the _id in blogs collection
          as: "blog", // Populate blog field
        },
      },
      {
        $addFields: {
          universities: {
            $map: {
              input: "$universities",
              as: "university",
              in: {
                $mergeObjects: [
                  "$$university",
                  {
                    countryName: "$countryName",
                    countryPhotos: "$countryPhotos",
                    countryCode: "$countryCode",
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          countryName: 1,
          countryCode: 1,
          countryPhotos: 1,
          countryStudentPopulation: 1,
          countryCurrency: 1,
          countryLanguages: 1,
          universities: 1,
          blog: 1, // Fully populated blog
          totalUniversities: { $size: "$universities" }, // Count universities
          totalCourses: {
            $sum: {
              $map: {
                input: "$universities",
                as: "university",
                in: { $size: { $ifNull: ["$$university.courseId", []] } }, // Count courses per university
              },
            },
          },
          totalBlogs: { $size: "$blog" }, // Count blogs
        },
      },
    ]); // Your aggregation logic

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const responseData = JSON.stringify({
      data: result,
      // countriesCount: result.length,
      // universitiesCount: result.reduce(
      //   (acc, country) => acc + country.universities.length,
      //   0
      // ),
      // coursesCount: result.reduce(
      //   (acc, country) =>
      //     acc +
      //     country.universities.reduce(
      //       (courseAcc, university) =>
      //         courseAcc + (university.courseId?.length || 0),
      //       0
      //     ),
      //   0
      // ),
      // blogCount: result.reduce((acc, country) => acc + country.blog.length, 0),
    });

    // Select the best compression algorithm based on client request
    const acceptEncoding = req.headers["accept-encoding"] || "";
    res.setHeader("Content-Type", "application/json");

    if (acceptEncoding.includes("br")) {
      res.setHeader("Content-Encoding", "br");
      Readable.from(responseData).pipe(zlib.createBrotliCompress()).pipe(res);
    } else if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
      Readable.from(responseData).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.send(responseData); // Send without compression if client doesn't support Brotli or Gzip
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAllCountries = async (req, res) => {
  try {
    const updateCountry = req.body;
    const result = await countryModel.updateMany({}, updateCountry);
    clearCountryCache();
    res.status(200).json({
      message: "Country updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating users", error: error.message });
  }
};

// Update a country by ID

const updateCountry = async (req, res) => {
  const id = req.params.id;
  try {
    const countryData = await countryModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();

    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }

    await createNotification("Country", countryData, "countryName", "updated");

    // Remove country reference from universities if they were removed from the country model
    await universityModel.updateMany(
      { uniCountry: id, _id: { $nin: countryData.universities } },
      { $unset: { uniCountry: "" } }
    );

    await BlogModel.updateMany(
      { blogCountry: id, _id: { $nin: countryData.universities } },
      { $unset: { blogCountry: "" } }
    );

    clearCountryCache();
    res.status(200).json({
      data: countryData,
      message: "Country updated successfully and universities cleaned up!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a country by ID

const deleteCountry = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find and delete the country
    const deletedCountry = await countryModel.findByIdAndDelete(id);
    if (!deletedCountry) {
      return res.status(404).json({ message: "Country not found" });
    }
    await createNotification(
      "Country",
      deletedCountry,
      "countryName",
      "deleted"
    );

    // Step 2: Remove country reference from universities
    await universityModel.updateMany(
      { uniCountry: id },
      { $unset: { uniCountry: "" } }
    );

    await BlogModel.updateMany(
      { blogCountry: id },
      { $unset: { blogCountry: "" } }
    );

    clearCountryCache();
    res.status(200).json({
      message: "Country deleted successfully and removed from universities!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCountry,
  getCountryById,
  getAllCountries,
  updateAllCountries,
  getAllCountriesByQuery,
  updateCountry,
  deleteCountry,
  getCountryByName,
  getFullDepthData,
};
