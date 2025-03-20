const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300, checkperiod: 310 });
const blogModel = require("../models/BlogModel");
const countryModel = require("../models/CountryModel");
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

const getAllBlog = async (req, res) => {
  const {
    admin,
    limit,
    page,
    fields,
    search,
    featured,
    published,
    draft,
    startDate,
    endDate,
  } = req.query;
  try {
    const parsedLimit = parseInt(limit || 10); // Default limit to 10
    const parsedPage = parseInt(page || 1); // Default page to 1
    const skip = (parsedPage - 1) * parsedLimit; // Calculate skip value

    // Convert `fields` query string into an object for MongoDB projection
    let projectFields = { _id: 1 };

    if (fields) {
      fields.split(",").forEach((field) => {
        projectFields[field] = 1;
      });
    } else {
      projectFields = {
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
      };
    }

    // Build the match query for filtering
    const matchQuery = {};
    if (search) {
      matchQuery.$or = [
        { "blogTitle.en": { $regex: search, $options: "i" } }, // Case-insensitive search on blogTitle
        { "blogSubtitle.en": { $regex: search, $options: "i" } }, // Case-insensitive search on blogSubtitle
        { "blogCountry.countryName.en": { $regex: search, $options: "i" } }, // Case-insensitive search on countryName
        { blogAuthor: { $regex: search, $options: "i" } }, // Case-insensitive search on author
      ];
    }

    if (startDate && endDate) {
      const start = new Date(startDate); // Convert startDate to a Date object
      const end = new Date(endDate); // Convert endDate to a Date object

      // Ensure the dates are valid
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        matchQuery.blogAdded = {
          $gte: start, // Greater than or equal to startDate
          $lte: end, // Less than or equal to endDate
        };
      }
    }

    // Add filters for featured, published, and draft
    if (featured === "true") {
      matchQuery.featuredBlog = true;
    }
    if (published === "true") {
      matchQuery.publishImmediately = true;
    }
    if (draft === "true") {
      matchQuery.publishImmediately = false; // Assuming draft means not published
    }

    // Aggregation query for fetching blogs
    const blogsQuery = [
      { $match: matchQuery }, // Apply the search and filter conditions
      {
        $lookup: {
          from: "countries",
          localField: "blogCountry",
          foreignField: "_id",
          as: "blogCountry",
        },
      },
      { $unwind: { path: "$blogCountry", preserveNullAndEmptyArrays: true } },
      { $project: projectFields },
      { $sort: { _id: -1 } }, // Sort newest first
      { $skip: skip }, // Skip documents for pagination
      { $limit: parsedLimit }, // Limit the number of documents
    ];

    let blogs = await blogModel.aggregate(blogsQuery);

    // Ensure uniqueness for admin
    if (admin === "true") {
      const seen = new Set();
      blogs = blogs.filter((blog) => {
        if (!seen.has(blog._id.toString())) {
          seen.add(blog._id.toString());
          return true;
        }
        return false;
      });
    }

    // Only fetch stats when `admin=true`
    let stats = {};
    if (admin === "true") {
      const [countStats] = await blogModel.aggregate([
        { $match: matchQuery }, // Apply the same filters for stats
        {
          $group: {
            _id: null,
            totalArticles: { $sum: 1 },
            publishedArticles: {
              $sum: { $cond: ["$publishImmediately", 1, 0] },
            },
            featuredArticles: { $sum: { $cond: ["$featuredBlog", 1, 0] } },
          },
        },
      ]);

      stats = {
        totalArticles: countStats?.totalArticles || 0,
        publishedArticles: countStats?.publishedArticles || 0,
        featuredArticles: countStats?.featuredArticles || 0,
      };
    }

    // Get total count of blogs for pagination (with the same filters)
    const totalBlogs = await blogModel.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalBlogs / parsedLimit);

    res.status(200).json({
      data: blogs,
      ...(admin === "true" && { stats }), // Only include `stats` when `admin=true`
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalBlogs,
        limit: parsedLimit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllBlogLikeInsta = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const lastId = req.query.lastId;

    // Cache key based on `limit` & `lastId` to store different requests
    const cacheKey = `blog_limit_${limit}_lastId_${lastId || "start"}`;
    const cachedData = cache.get(cacheKey);

    // **If cache exists, return cached data**
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let filter = {};
    if (lastId) {
      filter = { _id: { $gt: lastId } };
    }

    const blogs = await blogModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .populate("blogCountry")
      .lean();

    // **Store the last fetched ID**
    const newLastId = blogs.length ? blogs[blogs.length - 1]._id : null;

    const responseData = {
      data: blogs,
      meta: {
        lastId: newLastId,
        hasNextPage: !!newLastId,
      },
    };

    // **Cache the response for future requests**
    cache.set(cacheKey, responseData);

    res.status(200).json(responseData);
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
  getAllBlogLikeInsta,
  deleteBlog,
  getBlogByName,
};
