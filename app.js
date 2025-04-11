const express = require("express")
const mongoose = require("mongoose")
const compression = require("compression")
const helperController = require("./controllers/HelperController")
const cron = require("node-cron")
const cors = require("cors")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 4000

// Optimized compression - only compress responses larger than 1KB
app.use(
  compression({
    level: 6, // Higher compression level for better compression ratio
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false
      }
      return compression.filter(req, res)
    },
  }),
)

// Body parsers with size limits to prevent large payload attacks
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))

// Optimized CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).send("Request Timeout")
  })
  next()
})

// Scheduled tasks
cron.schedule("0 */2 * * *", () => {
  console.log("Running scheduled blog publish check...")
  helperController.publishScheduledBlogs()
})

// Basic route
app.get("/", (req, res) => {
  res.send("API is running...")
})

// Require Routes
const userRoutes = require("./routes/UserRoutes")
const universityRoutes = require("./routes/UniversityRoutes")
const googleRoutes = require("./routes/GoogleRoutes")
const countryRoutes = require("./routes/CountryRoutes")
const courseRoutes = require("./routes/CourseRoutes")
const blogRoutes = require("./routes/BlogRoutes")
const keywordRoutes = require("./routes/KeywordRoutes")
const analysisRoutes = require("./routes/AnalysisRoutes")
const tagRoutes = require("./routes/TagRoutes")
const applyRoutes = require("./routes/ApplyRoutes")
const facultyRoutes = require("./routes/FacultyRoutes")
const majorsRoutes = require("./routes/MajorsRoutes")
const helperRoutes = require("./routes/HelperRoutes")
const searchRoutes = require("./routes/SearchRoutes")

// Define API Endpoints with prefixes
app.use("/api/users", userRoutes)
app.use("/api/university", universityRoutes)
app.use("/api/country", countryRoutes)
app.use("/api/course", courseRoutes)
app.use("/api/google", googleRoutes)
app.use("/api/blog", blogRoutes)
app.use("/api/keyword", keywordRoutes)
app.use("/api/analysis", analysisRoutes)
app.use("/api/tags", tagRoutes)
app.use("/api/apply", applyRoutes)
app.use("/api/faculty", facultyRoutes)
app.use("/api/majors", majorsRoutes)
app.use("/api/helper", helperRoutes)
app.use("/api/search", searchRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`)
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong on the server",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Enhanced MongoDB connection with optimized options
const connectDB = async (retries = 5) => {
  const options = {
    maxPoolSize: 50, // Optimize connection pool size
    socketTimeoutMS: 30000, // Socket timeout
    serverSelectionTimeoutMS: 5000,
    family: 4, // Use IPv4, skip trying IPv6
    connectTimeoutMS: 10000,
  }

  while (retries) {
    try {
      await mongoose.connect(process.env.DB_URL, options)
      console.log("Connected to MongoDB")
      break
    } catch (err) {
      console.error("Failed to connect to DB", err)
      retries -= 1
      console.log(`Retries left: ${retries}`)
      await new Promise((res) => setTimeout(res, 5000))
    }
  }

  if (retries === 0) {
    console.error("Could not connect to MongoDB after multiple attempts.")
    process.exit(1)
  }
}

// Start server with improved error handling
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })

  // Handle server errors
  server.on("error", (error) => {
    console.error("Server error:", error)
    if (error.code === "EADDRINUSE") {
      console.log("Address in use, retrying...")
      setTimeout(() => {
        server.close()
        server.listen(PORT)
      }, 1000)
    }
  })

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.info("SIGTERM signal received.")
    console.log("Closing HTTP server.")
    server.close(() => {
      console.log("HTTP server closed.")
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed.")
        process.exit(0)
      })
    })
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason)
    // Application specific logging, throwing an error, or other logic here
  })
})
