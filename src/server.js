import app from "./app.js";
import database from "./utils/database.js";
import { server } from "./config/index.js";

// Connect to MongoDB and start server
database
  .connect()
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
  database
    .disconnect()
    .then(() => {
      console.log("Server closed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error during shutdown:", error);
      process.exit(1);
    });
});
