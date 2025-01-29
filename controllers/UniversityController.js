const universityModel = require("../models/UniversityModel");

// Create a new University
const createUniversity = async (req, res) => {
  try {
    const universityData = new universityModel(req.body);
    await universityData.save();
    res.status(201).json({
      data: universityData,
      message: "University created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a University by ID
const getUniversityById = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel.findById(id).lean();
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ data: universityData });
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
    const universityData = await universityModel.find().populate("courseId");
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({
      data: universityData,
      message: "University updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a University by ID
const updateUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const universityData = await universityModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!universityData) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({
      data: universityData,
      message: "University updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a University by ID
const deleteUniversity = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedUniversity = await universityModel.findByIdAndDelete(id);
    if (!deletedUniversity) {
      return res.status(404).json({ message: "University not found" });
    }
    res.status(200).json({ message: "University deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createUniversity,
  getUniversityById,
  getAllUniversities,
  updateUniversity,
  deleteUniversity,
};
