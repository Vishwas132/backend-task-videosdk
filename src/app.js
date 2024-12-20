import express, { json, urlencoded } from "express";
import { getConnectionStatus, connect, disconnect } from "./utils/database";
import notificationRoutes from "./services/ingestion/notificationController";
import preferenceRoutes from "./services/preferences/preferenceController";
import { server } from "./config";

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
    dbStatus: getConnectionStatus(),
  });
});

// Routes
app.use("/api", notificationRoutes);
app.use("/api", preferenceRoutes);

// Connect to MongoDB
connect()
  .then(() => {
    // Start server
    const port = server.port;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${server.nodeEnv}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

// Handle process termination
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  disconnect()
    .then(() => {
      console.log("Server closed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error during shutdown:", error);
      process.exit(1);
    });
});

export default app;
