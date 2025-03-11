const NodeCache = require("node-cache");
const TagModel = require("../models/TagModel");
const CourseModel = require("../models/CourseModel");
const FacultyModel = require("../models/FacultyModel");
const BlogModel = require("../models/BlogModel");
const MajorsModel = require("../models/MajorsModel");
const UniversityModel = require("../models/UniversityModel");
const CountryModel = require("../models/CountryModel");
const notificationModel = require("../models/NotificationModel");
const UserModel = require("../models/UserModel"); // Import UserModel
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 }); // 5 min TTL

const getAllDropdownData = async (req, res) => {
  try {
    // Check if data exists in cache
    const cachedData = cache.get("dropdownData");
    if (cachedData) {
      return res.status(200).json({
        data: cachedData,
        message: "Dropdown data fetched from cache",
      });
    }

    // Fetch data if not in cache
    const [
      tags,
      courses,
      faculties,
      blogs,
      majors,
      universities,
      countries,
      userCount,
    ] = await Promise.all([
      TagModel.find().select("_id tags").lean(),
      CourseModel.find().select("_id CourseName").lean(),
      FacultyModel.find().select("_id facultyName").lean(),
      BlogModel.find().select("_id blogTitle").lean(),
      MajorsModel.find().select("_id majorName").lean(),
      UniversityModel.find().select("_id uniName").lean(),
      CountryModel.find().select("_id countryName countryPhotos").lean(),
      UserModel.countDocuments(), // Get only the count of users
    ]);

    const dropdownData = {
      tags,
      courses,
      faculties,
      blogs,
      majors,
      universities,
      countries,
      userCount, // Include user count
    };

    cache.set("dropdownData", dropdownData);

    res.status(200).json({
      data: dropdownData,
      message: "Dropdown data fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNotification = async (category, itemData, field, action) => {
  try {
    // Define valid categories
    const validCategories = [
      "University",
      "Course",
      "Country",
      "Blog",
      "Major",
      "Faculty",
    ];
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    // Define valid actions
    const validActions = ["created", "updated", "deleted"];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Action-based message template
    const actionMessages = {
      created: {
        en: `New ${category} created: ${itemData[field]?.en || "Unnamed"}`,
        ar: `تم إنشاء ${category}: ${itemData[field]?.ar || "بدون اسم"}`,
      },
      updated: {
        en: `${category} updated: ${itemData[field]?.en || "Unnamed"}`,
        ar: `تم تحديث ${category}: ${itemData[field]?.ar || "بدون اسم"}`,
      },
      deleted: {
        en: `${category} deleted: ${itemData[field]?.en || "Unnamed"}`,
        ar: `تم حذف ${category}: ${itemData[field]?.ar || "بدون اسم"}`,
      },
    };

    // Create a notification with the correct message
    const notification = new notificationModel({
      itemId: itemData._id, // ID of the item
      message: actionMessages[action], // Select message based on action
      item: { en: itemData[field].en, ar: itemData[field].ar },
      category: category,
      mark: "Not Read", // Default status
    });

    // Save notification
    await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error.message);
  }
};

const getAllNotification = async (req, res) => {
  try {
    const notification = await notificationModel
      .find()

      .lean();

    res.status(200).json({ data: notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAllNotification = async (req, res) => {
  try {
    const result = await notificationModel.updateMany(
      { mark: "Not Read" }, // Only update unread notifications
      { $set: { mark: "Read" } } // Set them as Read
    );

    res.status(200).json({
      message: "All notifications marked as Read",
      modifiedCount: result.modifiedCount, // Number of documents updated
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating notifications", error: error.message });
  }
};

module.exports = {
  getAllDropdownData,
  createNotification,
  getAllNotification,
  updateAllNotification,
};
