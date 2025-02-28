const universityModel = require("../models/UniversityModel");
const facultyModel = require("../models/FacultyModel");

// Create a new University
const createUniversity = async (req, res) => {
  try {
    const { faculty, ...universityDetails } = req.body; // Extract faculty IDs if provided

    // Step 1: Create the university
    const newUniversity = new universityModel(universityDetails);
    await newUniversity.save();

    // Step 2: If faculties are provided, update them with university reference
    if (faculty && faculty.length > 0) {
      await facultyModel.updateMany(
        { _id: { $in: faculty } }, // Find faculties by IDs
        { $set: { university: newUniversity._id } } // Update them with the new university ID
      );

      // Step 3: Add faculty IDs to the university's faculty array
      newUniversity.faculty = faculty;
      await newUniversity.save();
    }

    res.status(201).json({
      data: newUniversity,
      message: "University created successfully with faculties updated!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a University by ID
const getUniversityById = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel
      .findById(id)
      .lean()
      .populate("courseId faculty");
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ data: universityData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUniversityByName = async (req, res) => {
  const name = req.params.name; // Get university name from route parameters

  try {
    const universityData = await universityModel.aggregate([
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: name, $options: "i" } }, // Case-insensitive search in English name
            { "uniName.ar": { $regex: name, $options: "i" } }, // Case-insensitive search in Arabic name
          ],
        },
      },
      // Lookup country data by matching universities' ids in the country's universities array
      {
        $lookup: {
          from: "countries", // The countries collection
          localField: "_id", // The university _id
          foreignField: "universities", // Match with university _id in Country
          as: "country", // This will store country data in the "country" array
        },
      },
      {
        $unwind: {
          path: "$country",
          preserveNullAndEmptyArrays: true, // Keep universities without a country
        },
      },
      {
        $addFields: {
          countryName: {
            $ifNull: ["$country.countryName", ""], // Default to empty string if missing
          },
          countryFlag: {
            $ifNull: ["$country.countryPhotos.countryFlag", ""],
          },
        },
      },
      // Lookup courses related to the university
      {
        $lookup: {
          from: "courses", // The courses collection
          localField: "courseId", // The field in University model containing course IDs
          foreignField: "_id", // Match with Course _id
          as: "courses", // Store populated courses in "courses"
          pipeline: [
            {
              $lookup: {
                from: "tags", // The tags collection
                localField: "Tags", // Field in Course model referencing Tags
                foreignField: "_id", // Match with _id in Tags collection
                as: "Tags", // Populate Tags field
              },
            },
            {
              $project: {
                CourseName: 1,
                ModeOfStudy: 1,
                DeadLine: 1,
                CourseFees: 1,
                Tags: 1, // Include populated Tags field
              },
            },
          ],
        },
      },
      {
        $project: {
          uniName: 1, // University name
          uniSymbol: 1, // University logo
          courses: 1, // Populated courses (now including Tags)
          scholarshipAvailability: 1,
          uniDiscount: 1,
          uniMainImage: 1,
          uniDeadline: 1,
          uniDuration: 1,
          uniStartDate: 1,
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          studyLevel: 1,
          uniLocation: 1,
          uniTutionFees: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniLibrary: 1,
          uniSports: 1,
          studentLifeStyleInUni: 1,
          countryName: 1,
          countryFlag: 1,
        },
      },
    ]);

    if (!universityData || universityData.length === 0) {
      return res.status(404).json({ message: "University not found" });
    }

    res.status(200).json({
      data: universityData[0], // Since we're searching by name, return the first match
      message: "University fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all Universities
// const getAllUniversities = async (req, res) => {
//   try {
//     const universities = await universityModel.aggregate([
//       // Step 1: Lookup the course information
//       {
//         $lookup: {
//           from: "courses", // The collection name for courses
//           localField: "courseId", // Field in the university model
//           foreignField: "_id", // Field in the course model
//           as: "courseDetails", // The resulting array of course details
//         },
//       },
//       // Step 2: Lookup the country information
//       {
//         $lookup: {
//           from: "countries", // The collection name for countries
//           localField: "_id", // Assuming the university's `_id` is referenced in the country's `universities` field
//           foreignField: "universities", // Field in the country model that references universities
//           as: "countryDetails", // The resulting array of country details
//         },
//       },
//       // Step 3: Unwind the arrays to make them objects
//       {
//         $unwind: {
//           path: "$courseDetails",
//           preserveNullAndEmptyArrays: true, // Include universities even if they have no courses
//         },
//       },
//       {
//         $unwind: {
//           path: "$countryDetails",
//           preserveNullAndEmptyArrays: true, // Include universities even if they have no country
//         },
//       },
//       // Step 4: Project all the university fields along with course and country data
//       {
//         $project: {
//           uniName: 1, // Include university name
//           uniSymbol: 1,
//           courseDetails: 1, // Include all course details
//           scholarshipAvailability: 1,
//           inTakeMonth: 1,
//           inTakeYear: 1,
//           spokenLanguage: 1,
//           uniType: 1,
//           entranceExamRequired: 1,
//           studyLevel: 1,
//           uniLocation: 1,
//           uniTutionFees: 1,
//           uniOverview: 1,
//           uniAccomodation: 1,
//           uniLibrary: 1,
//           uniSports: 1,
//           studentLifeStyleInUni: 1,
//           courseDetails: 1,
//           countryName: "$countryDetails.countryName", // Extract country name (e.g., { en: ..., ar: ... })
//         },
//       },
//     ]);

//     res.status(200).json({ data: universities });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
const getAllUniversities = async (req, res) => {
  try {
    // Aggregation pipeline to join universities with their countries and populate courses
    const universityData = await universityModel.aggregate([
      // Lookup country data by matching universities' ids in the country's universities array
      {
        $lookup: {
          from: "countries", // The countries collection to join
          localField: "_id", // The university _id
          foreignField: "universities", // Field in country that references university _id
          as: "country", // This will add the country data in a new array field "country"
        },
      },
      {
        $unwind: {
          path: "$country", // Unwind the country array to get a single object instead of an array
          preserveNullAndEmptyArrays: true, // Preserve universities without a matching country
        },
      },
      {
        $addFields: {
          countryName: {
            $ifNull: ["$country.countryName", ""], // Default to empty string if countryName is missing
          },
          countryFlag: {
            $ifNull: ["$country.countryPhotos.countryFlag", ""], // Default to empty string if countryFlag is missing
          },
        },
      },
      // Lookup to populate the courseId field with course data
      {
        $lookup: {
          from: "courses", // The courses collection to join
          localField: "courseId", // The field in University model containing course IDs
          foreignField: "_id", // Match with the _id in the Course collection
          as: "courseId", // This will add the course data to the "courseId" field (instead of courses)
        },
      },
      {
        $project: {
          // Include all university fields and additional countryName, countryFlag
          uniName: 1, // University name
          uniSymbol: 1, // University symbol
          courseId: 1, // Include the full populated course data in courseId
          scholarshipAvailability: 1,
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          studyLevel: 1,
          uniLocation: 1,
          uniTutionFees: 1,
          uniDiscount: 1,
          uniMainImage: 1,
          uniDuration: 1,
          uniDeadline: 1,
          uniStartDate: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniLibrary: 1,
          uniSports: 1,
          studentLifeStyleInUni: 1,
          countryName: 1, // Added countryName field
          countryFlag: 1, // Added countryFlag field from countryPhotos
        },
      },
    ]);

    if (!universityData || universityData.length === 0) {
      return res.status(404).json({ message: "Universities not found" });
    }

    res.status(200).json({
      data: universityData,
      message: "Universities fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUniversitiesLimitedQuery = async (req, res) => {
  try {
    let { page = 1, limit = 9, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Aggregation pipeline
    const universityData = await universityModel.aggregate([
      {
        $lookup: {
          from: "countries",
          localField: "_id",
          foreignField: "universities",
          as: "country",
        },
      },
      { $unwind: { path: "$country", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          countryName: { $ifNull: ["$country.countryName", {}] }, // Preserve object structure
          countryFlag: { $ifNull: ["$country.countryPhotos.countryFlag", ""] },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseId",
        },
      },

      // 🔹 Now we apply the search filter AFTER the lookup!
      {
        $match: {
          $or: [
            { "uniName.en": { $regex: search, $options: "i" } }, // Search by University Name
            { "countryName.en": { $regex: search, $options: "i" } }, // Search by Country Name (now available)
          ],
        },
      },

      {
        $project: {
          uniName: 1,
          uniSymbol: 1,
          courseId: 1,
          scholarshipAvailability: 1,
          spokenLanguage: 1,
          uniType: 1,
          inTakeMonth: 1,
          inTakeYear: 1,
          entranceExamRequired: 1,
          studyLevel: 1,
          uniLocation: 1,
          uniTutionFees: 1,
          uniDiscount: 1,
          uniMainImage: 1,
          uniDuration: 1,
          uniDeadline: 1,
          uniStartDate: 1,
          uniOverview: 1,
          uniAccomodation: 1,
          uniLibrary: 1,
          uniSports: 1,
          studentLifeStyleInUni: 1,
          countryName: 1,
          countryFlag: 1,
        },
      },
      { $skip: (page - 1) * limit }, // Pagination
      { $limit: limit }, // Pagination
    ]);

    if (!universityData.length) {
      return res.status(404).json({ message: "Universities not found" });
    }

    res.status(200).json({
      data: universityData,
      message: "Universities fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a University by ID
const updateUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const { faculty, ...universityDetails } = req.body; // Extract faculty array

    // Step 1: Find the existing university
    const existingUniversity = await universityModel.findById(id);
    if (!existingUniversity) {
      return res.status(404).json({ message: "University not found" });
    }

    // Step 2: Find faculties that were removed
    const removedFaculties = existingUniversity.faculty.filter(
      (facultyId) => !faculty.includes(facultyId.toString())
    );

    // Step 3: Unset the university reference from removed faculties
    if (removedFaculties.length > 0) {
      await facultyModel.updateMany(
        { _id: { $in: removedFaculties } }, // Faculties removed from the university
        { $unset: { universities: "" } } // Remove their university reference
      );
    }

    // Step 4: Set the university reference for newly added faculties
    await facultyModel.updateMany(
      { _id: { $in: faculty } }, // Faculties in the updated list
      { $set: { universities: id } }
    );

    // Step 5: Update the university with the new faculty list
    const updatedUniversity = await universityModel
      .findByIdAndUpdate(id, { ...universityDetails, faculty }, { new: true })
      .lean();

    res.status(200).json({
      data: updatedUniversity,
      message: "University updated successfully with faculties!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a University by ID
const deleteUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    // Step 1: Find the university to check if it exists before deleting
    const deletedUniversity = await universityModel.findByIdAndDelete(id);
    if (!deletedUniversity) {
      return res.status(404).json({ message: "University not found" });
    }

    // Step 2: Remove university ID from all faculties that reference it
    await facultyModel.updateMany(
      { universities: id },
      { $pull: { universities: id } }
    );

    res.status(200).json({
      message: "University deleted successfully and removed from faculties!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createUniversity,
  getUniversityById,
  getUniversityByName,
  getAllUniversities,
  getUniversitiesLimitedQuery,
  updateUniversity,
  deleteUniversity,
};
