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
import { seedAccounts } from "./seed/seedAccounts.js";

const app = express();

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(["8.8.8.8", "1.1.1.1", "0.0.0.0"]);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://tescongroup.netlify.app",
  "https://tescongroupadmin.netlify.app",
  "https://admin.tescon-group.com",
  "https://tescon-group.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("CORS Blocked Origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
connectDB();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

initCloudinary();
// Ensure MongoDB is connected before handling any route
app.use(async (req, res, next) => {
  try {
    await connA();

    next();
  } catch (err) {
    console.error("DB connection error middleware:", err);
    res.status(500).json({ message: "Database connection error" });
  }
});

// Routes
app.get("/api/warmup", (req, res) => res.send("Warmed up ☕"));
app.use("/api", authRoute);
app.use("/api/public", publicRoute);

app.use("/api", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/user", userProtectedRoute);

app.get("/api", (req, res) => {
  res.json("API established");
});
app.get("/", (req, res) => {
  res.json("Hello from Tescon API");
});
app.get("/seed", async (req, res) => {
  // await seedCategories();
  // await seedProducts();
  // await seedData();
  // await seedAccounts();
  res.json({ message: "Categories seeded successfully" });
});
app.all("*", (req, res) => {
  res.status(404).json({ message: "API route not found", path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({ message: "Internal server error" });
});

// Correctly export for Vercel:
export { app };
export default app;
