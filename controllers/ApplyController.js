const NodeCache = require("node-cache");
const ApplyModel = require("../models/ApplyModel");

// Create a new Apply
const createApply = async (req, res) => {
  try {
    const { category } = req.body;

    // Validate if category is valid
    const allowedCategories = ["University", "Course", "Major"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    const newApplyData = new ApplyModel(req.body);
    await newApplyData.save(); // Save the new record

    return res.status(201).json({
      message: "Apply created successfully",
      data: newApplyData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a Apply by ID
const getApplyById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the Apply and populate the 'universities' field
    const ApplyData = await ApplyModel.findById(id)
      .populate({
        path: "itemId",
        select: "CourseName uniName majorName",
      })
      .lean();
    if (!ApplyData) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res.status(200).json({ data: ApplyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getAllApply = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      startDate,
      endDate,
    } = req.query;

    // Parse query parameters
    const parsedPage = parseInt(page); // Default page is 1
    const parsedLimit = parseInt(limit); // Default limit is 10
    const skip = (parsedPage - 1) * parsedLimit; // Calculate the number of documents to skip

    const query = {};
    if (search) {
      // Add search condition to the query
      query.$or = [
        { "userDetails.personName": { $regex: search, $options: "i" } }, // Case-insensitive search on name
        { "userDetails.personEmail": { $regex: search, $options: "i" } }, // Case-insensitive search on email
        // Add more fields to search if needed
      ];
    }

    if (startDate && endDate) {
      const start = new Date(startDate); // Convert startDate to a Date object
      const end = new Date(endDate); // Convert endDate to a Date object

      // Ensure the dates are valid
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        query.appliedDate = {
          $gte: start, // Greater than or equal to startDate
          $lte: end, // Less than or equal to endDate
        };
      }
    }

    if (status) {
      let statusArray;
      try {
        statusArray = JSON.parse(status); // Parse the URL-encoded array
      } catch (err) {
        statusArray = [status]; // Fallback to a single role if parsing fails
      }

      // Add filter for `ActionStatus` using the parsed roles (case-sensitive)
      query.status = { $in: statusArray }; // Case-sensitive match
    }

    if (status) {
      let statusArray;
      try {
        statusArray = JSON.parse(status); // Parse the URL-encoded array
      } catch (err) {
        statusArray = [status]; // Fallback to a single role if parsing fails
      }

      // Add filter for `ActionStatus` using the parsed roles (case-sensitive)
      query.status = { $in: statusArray }; // Case-sensitive match
    }

    if (category) {
      let categoryArray;
      try {
        categoryArray = JSON.parse(category); // Parse the URL-encoded array
      } catch (err) {
        categoryArray = [category]; // Fallback to a single role if parsing fails
      }

      // Add filter for `ActionStatus` using the parsed roles (case-sensitive)
      query.category = { $in: categoryArray }; // Case-sensitive match
    }

    // Fetch applications with pagination and populate the `itemId` field
    const Apply = await ApplyModel.find(query)
      .populate({
        path: "itemId",
        select: "CourseName uniName countryName", // Select specific fields to populate
      })
      .skip(skip) // Skip documents for pagination
      .limit(parsedLimit) // Limit the number of documents
      .lean(); // Convert to plain JavaScript objects

    // Get the total count of applications for pagination metadata
    const totalCount = await ApplyModel.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.status(200).json({
      data: Apply,
      pagination: {
        totalCount, // Total number of applications
        totalPages, // Total number of pages
        currentPage: parsedPage, // Current page
        limit: parsedLimit, // Number of applications per page
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Apply by ID
const updateApply = async (req, res) => {
  const id = req.params.id;
  try {
    const ApplyData = await ApplyModel.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();
    if (!ApplyData) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res
      .status(200)
      .json({ data: ApplyData, message: "Apply updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Apply by ID
const deleteApply = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedApply = await ApplyModel.findByIdAndDelete(id);
    if (!deletedApply) {
      return res.status(404).json({ message: "Apply not found" });
    }
    res.status(200).json({ message: "Apply deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createApply,
  getApplyById,
  getAllApply,
  updateApply,
  deleteApply,
};
