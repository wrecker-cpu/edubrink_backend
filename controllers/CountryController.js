const NodeCache = require("node-cache");
const countryModel = require("../models/CountryModel");
const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

// Create a new country
const createCountry = async (req, res) => {
  try {
    const countryData = new countryModel(req.body);
    await countryData.save();
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
      .populate("universities blog")
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
  // const cacheKey = "fullDepthData"; // Cache key to identify the stored data

  // // Check if the data is already in the cache
  // const cachedData = cache.get(cacheKey);
  // if (cachedData) {
  //   return res.status(200).json(cachedData); // Return the cached data
  // }

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
        },
      },
      {
        $group: {
          _id: "$_id", // Group back by country
          countryName: { $first: "$countryName" },
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
        $project: {
          countryName: 1,
          countryCode: 1,
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
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const responseData = {
      data: result,
      countriesCount: result.length,
      universitiesCount: result.reduce(
        (acc, country) => acc + country.totalUniversities,
        0
      ),
      coursesCount: result.reduce(
        (acc, country) => acc + country.totalCourses,
        0
      ),
      blogCount: result.reduce((acc, country) => acc + country.totalBlogs, 0),
    };

    // Store the response data in the cache with the cache key
    // cache.set(cacheKey, responseData);

    res.status(200).json(responseData); // Return the response
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAllCountries = async (req, res) => {
  try {
    const updateCountry = req.body;
    const result = await countryModel.updateMany({}, updateCountry);

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
      return res.status(404).json({ message: "country not found" });
    }
    res
      .status(200)
      .json({ data: countryData, message: "country updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a country by ID
const deleteCountry = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedcountry = await countryModel.findByIdAndDelete(id);
    if (!deletedcountry) {
      return res.status(404).json({ message: "country not found" });
    }
    res.status(200).json({ message: "country deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCountry,
  getCountryById,
  getAllCountries,
  updateAllCountries,
  updateCountry,
  deleteCountry,
  getCountryByName,
  getFullDepthData,
};
