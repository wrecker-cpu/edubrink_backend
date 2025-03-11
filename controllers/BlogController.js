const blogModel = require("../models/BlogModel");
const countryModel = require("../models/CountryModel");
const notificationModel = require("../models/NotificationModel");
const { createNotification } = require("../controllers/HelperController");

// Create a new blog
const createBlog = async (req, res) => {
  try {
    const { blogCountry, ...blogDetails } = req.body;

    const blogData = new blogModel({ ...blogDetails, blogCountry });
    await blogData.save();

    await createNotification("Blog", blogData, "blogTitle", "created");

    if (blogCountry) {
      await countryModel.findByIdAndUpdate(
        blogCountry,
        { $push: { blog: blogData._id } },
        { new: true }
      );
    }
    res
      .status(201)
      .json({ data: blogData, message: "blog created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a blog by ID
const getBlogById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the blog and populate the 'universities' field
    const blogData = await blogModel
      .findById(id)
      .populate("blogCountry")
      .lean();
    if (!blogData) {
      return res.status(404).json({ message: "blog not found" });
    }
    res.status(200).json({ data: blogData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all blog
const getAllBlog = async (req, res) => {
  const { admin } = req.query;
  try {
    const blogs = await blogModel.aggregate([
      {
        $lookup: {
          from: "countries", // Name of the Country collection
          localField: "blogCountry", // Field in Blog schema (stores country ID)
          foreignField: "_id", // Field in Country schema (Primary Key)
          as: "blogCountry", // Renaming output array to blogCountry
        },
      },
      {
        $unwind: {
          path: "$blogCountry",
          preserveNullAndEmptyArrays: true, // Keep blogs even if no country is found
        },
      },
      {
        $project: {
          _id: 1,
          blogTitle: 1,
          blogSubtitle: 1,
          blogDescription: 1,
          blogAdded: 1,
          blogPhoto: 1,
          blogRelated: 1,
          blogAuthor: 1,
          blogCategory: 1,
          publishImmediately: 1,
          featuredBlog: 1,
          blogTags: 1,
          customURLSlug: 1,
          "blogCountry._id": 1,
          "blogCountry.countryName": 1,
          "blogCountry.countryCurrency": 1,
        },
      },
    ]);

    let uniqueBlogs = blogs;

    if (admin === "true") {
      const seen = new Set();
      uniqueBlogs = blogs.filter((blog) => {
        if (!seen.has(blog._id.toString())) {
          seen.add(blog._id.toString());
          return true;
        }
        return false;
      });
    }

    res.status(200).json({ data: uniqueBlogs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



const getBlogByName = async (req, res) => {
  const name = req.params.name;

  try {
    // Find the blog by either blogTitle.en or blogTitle.ar
    const blogData = await blogModel
      .findOne({
        $or: [
          { "blogTitle.en": name },
          { "blogTitle.ar": name },
          { "customURLSlug.en": name },
          { "customURLSlug.ar": name },
        ],
      })
      .populate({
        path: "blogCountry",
        populate: "blog",
      })
      .lean();

    if (!blogData) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // If no country is passed, just return the blog data
    res.status(200).json({ data: blogData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a blog by ID
const updateBlog = async (req, res) => {
  const id = req.params.id;
  try {
    const { blogCountry, ...blogDetails } = req.body;

    // Step 1: Find the existing blog before updating
    const existingBlog = await blogModel.findById(id).lean();
    if (!existingBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Step 2: Update the blog
    const updatedBlogData = await blogModel
      .findByIdAndUpdate(id, { blogCountry, ...blogDetails }, { new: true })
      .lean();

    await createNotification("Blog", updatedBlogData, "blogTitle", "updated");
    if (!updatedBlogData) {
      return res.status(404).json({ message: "Blog not found after update" });
    }

    // Step 3: Remove blog from the old country if blogCountry has changed
    if (existingBlog.blogCountry && existingBlog.blogCountry !== blogCountry) {
      await countryModel.findByIdAndUpdate(
        existingBlog.blogCountry,
        { $pull: { blog: id } }, // Remove the blog from old country
        { new: true }
      );
    }

    // Step 4: Add blog to the new country
    if (blogCountry) {
      await countryModel.findByIdAndUpdate(
        blogCountry,
        { $addToSet: { blog: id } }, // Prevent duplicates
        { new: true }
      );
    }

    res.status(200).json({
      data: updatedBlogData,
      message: "Blog updated successfully and country reference updated!",
    });
  } catch (err) {
    console.error("Error updating blog:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete a blog by ID
const deleteBlog = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedblog = await blogModel.findByIdAndDelete(id);
    if (!deletedblog) {
      return res.status(404).json({ message: "blog not found" });
    }
    await createNotification("Blog", deletedblog, "blogTitle", "deleted");

    await countryModel.updateMany({ blog: id }, { $pull: { blog: id } });

    res.status(200).json({ message: "blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createBlog,
  getBlogById,
  getAllBlog,
  updateBlog,
  deleteBlog,
  getBlogByName,
};
