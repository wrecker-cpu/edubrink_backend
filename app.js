const express = require("express")
const mongoose = require("mongoose")
const compression = require("compression")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cluster = require("cluster")
const os = require("os")
const cors = require("cors")
const cron = require("node-cron")
const helperController = require("./controllers/HelperController")
require("dotenv").config()

// Add this after require("dotenv").config();
console.log("ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS)

const numCPUs = os.cpus().length

// Implement clustering for better performance on multi-core systems
if (cluster.isMaster && process.env.NODE_ENV === "production") {
  console.log(`Master ${process.pid} is running`)

  // Fork workers equal to CPU count
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died, starting a new one`)
    cluster.fork()
  })
} else {
  const app = express()
  const PORT = process.env.PORT || 4000

  // Enhanced MongoDB connection with options
  const connectDB = async (retries = 5) => {
    const options = {
      maxPoolSize: 100, // Increase connection pool size
      socketTimeoutMS: 45000, // Increase socket timeout
      serverSelectionTimeoutMS: 5000,
      family: 4, // Use IPv4, skip trying IPv6
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

  // Middleware
  // Only compress responses larger than 1KB
  app.use(
    compression({
      level: 6, // Higher compression level
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false
        }
        return compression.filter(req, res)
      },
    }),
  )

  // Security middleware
  app.use(helmet())

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use(limiter)

  // CORS with specific configuration and better error handling
  app.use(
    cors({
      origin: ["https://edubrink.vercel.app", "http://localhost:5173"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )

  // Body parsers with size limits
  app.use(express.json({ limit: "1mb" }))
  app.use(express.urlencoded({ extended: true, limit: "1mb" }))

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

  // Routes - Lazy loading
  app.get("/", (req, res) => {
    res.send("API is running...")
  })

  // Define API Endpoints with prefixes using a function to lazy load routes
  const routeMap = {
    "/api/users": "./routes/UserRoutes",
    "/api/university": "./routes/UniversityRoutes",
    "/api/country": "./routes/CountryRoutes",
    "/api/course": "./routes/CourseRoutes",
    "/api/google": "./routes/GoogleRoutes",
    "/api/blog": "./routes/BlogRoutes",
    "/api/keyword": "./routes/KeywordRoutes",
    "/api/analysis": "./routes/AnalysisRoutes",
    "/api/tags": "./routes/TagRoutes",
    "/api/apply": "./routes/ApplyRoutes",
    "/api/faculty": "./routes/FacultyRoutes",
    "/api/majors": "./routes/MajorsRoutes",
    "/api/helper": "./routes/HelperRoutes",
    "/api/search": "./routes/SearchRoutes",
  }

  // Lazy load routes only when they're accessed
  Object.entries(routeMap).forEach(([path, routePath]) => {
    app.use(path, (req, res, next) => {
      const route = require(routePath)
      route(req, res, next)
    })
  })

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send("Something broke!")
  })

  // Connect to database
  connectDB()

  // Server creation with improved error handling
  const server = app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started - Server is running on port ${PORT}`)
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
}
