import express, { json, urlencoded } from "express";
import database from "./utils/database.js";
import notificationRoutes from "./routes/notification.routes.js";
import preferenceRoutes from "./routes/preference.routes.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger.js";

const app = express();

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dbStatus: database.getConnectionStatus(),
  });
});

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api", notificationRoutes);
app.use("/api", preferenceRoutes);

export default app;
