
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import profileRoutes from "./routes/profile.routes.js";
import companyRoutes from "./routes/company.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use(errorHandler);
app.use("/api/profiles", profileRoutes);
app.use("/api/companies", companyRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to UDAAN Careers API",
    version: "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "udaan-careers-backend",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`UDAAN Careers API running at http://localhost:${PORT}`);
});

