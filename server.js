import dotenv from "dotenv";
dotenv.config();

import express from "express";
import dns from "dns";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

import { connA } from "./db-config/db-conn.js";
import authRoute from "./routes/auth.js";
import publicRoute from "./routes/public.js";
import userRoute from "./routes/userRoutes.js";
import adminRoute from "./routes/admin/index.js";
import userProtectedRoute from "./routes/user/index.js";
import { initCloudinary } from "./utils/cloudinary.js";

import connectDB from "./db-config/db.js";
import { seedRateManager } from "./seed/rateManager.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(["8.8.8.8", "1.1.1.1"]);

/* =========================
   CORS
========================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://pubali-filling-station.netlify.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without Origin header
    // e.g. Postman, curl, server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("CORS Blocked Origin:", origin);

    return callback(new Error(`CORS blocked: ${origin}`));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  optionsSuccessStatus: 204,
};

/* =========================
   Database
========================= */

connectDB();

/* =========================
   CORS MUST COME BEFORE ROUTES
========================= */

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

/* =========================
   Body Parser
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Static Files
========================= */

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

initCloudinary();

/* =========================
   DB Middleware
========================= */

app.use(async (req, res, next) => {
  try {
    await connA();
    next();
  } catch (err) {
    console.error("DB connection error middleware:", err);

    res.status(500).json({
      success: false,
      message: "Database connection error",
    });
  }
});

/* =========================
   Routes
========================= */

app.get("/api/warmup", (req, res) => {
  res.send("Warmed up ☕");
});

app.use("/api", authRoute);
app.use("/api/public", publicRoute);
app.use("/api", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/user", userProtectedRoute);

app.get("/api", (req, res) => {
  res.json("API established");
});

app.get("/", (req, res) => {
  res.json("Hello from Purbali API");
});

/* =========================
   Seed
========================= */

app.get("/seed", async (req, res) => {
  try {
    await seedRateManager();

    res.json({
      success: true,
      message: "Rates seeded successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Seed failed",
    });
  }
});

/* =========================
   404
========================= */

app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.path,
  });
});

/* =========================
   Error Handler
========================= */

app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export { app };
export default app;
