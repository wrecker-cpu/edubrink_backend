const blogModel = require("../models/BlogModel");

// Create a new blog
const createBlog = async (req, res) => {
  try {
    const blogData = new blogModel(req.body);
    await blogData.save();
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
          localField: "_id", // Field in Blog schema to match
          foreignField: "blog", // Field in Country schema to match
          as: "countries", // Output array name
        },
      },
      {
        $group: {
          _id: "$_id", // Group by blog ID
          blogTitle: { $first: "$blogTitle" },
          blogSubtitle: { $first: "$blogSubtitle" },
          blogDescription: { $first: "$blogDescription" },
          blogAdded: { $first: "$blogAdded" },
          blogPhoto: { $first: "$blogPhoto" },
          blogRelated: { $first: "$blogRelated" },
          countries: {
            $push: {
              countryName: "$countries.countryName",
              countryPopulation: "$countries.countryStudentPopulation",
              countryCurrency: "$countries.countryCurrency",
            },
          }, // Keep each country as a separate object inside an array
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
          countries: 1, // Separate countries inside an array
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
  const name = req.params.name; // Assume 'name' is passed as a route parameter
  try {
    // Find the blog by name
    const blogData = await blogModel
      .findOne({ "blogName.en": name })

      .lean();

    if (!blogData) {
      return res.status(404).json({ message: "blog not found" });
    }
    res.status(200).json({ data: blogData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a blog by ID
const updateBlog = async (req, res) => {
  const id = req.params.id;
  try {
    const blogData = await blogModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!blogData) {
      return res.status(404).json({ message: "blog not found" });
    }
    res
      .status(200)
      .json({ data: blogData, message: "blog updated successfully" });
  } catch (err) {
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
