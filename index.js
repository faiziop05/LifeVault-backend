// server.js
import express from "express";
import cors from "cors";
import connectDB from "./configs/db.js";
import dotenv from "dotenv";

import authRoutes from "./routes/authenticationRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import appRoutes from "./routes/appRoutes.js";
import AppModel from "./models/AppModel.js";
import fs from "fs";
// import path from "path";

// Always use /tmp in AWS Lambda
const uploadDir = "/tmp/uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Load env variables
dotenv.config();
// Connect to MongoDB
connectDB().then(async () => {
  try {
    // Check if App doc exists
    const existingApp = await AppModel.findOne();

    if (!existingApp) {
      const newApp = await AppModel.create({
        version: "1.0.0",
      });
    } else {
      console.log("⚡ App entry already exists:", existingApp);
    }
  } catch (err) {
    console.error("❌ Error initializing App document:", err);
  }
});

const app = express();
app.get("/health", (req, res) => res.sendStatus(200));

app.get("/", (req, res) => {
  res.status(200).send("LifeVault is running");
});
// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/post", postRoutes);
app.use("/api/app", appRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// app.get('/health', (req, res) => res.sendStatus(200));

// Optional: root route for ALB health check
export default app