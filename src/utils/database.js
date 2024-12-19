const mongoose = require("mongoose");
const config = require("../config");

class Database {
  constructor() {
    this.mongoose = mongoose;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      console.log("MongoDB is already connected");
      return;
    }

    try {
      await this.mongoose.connect(config.mongodb.uri, config.mongodb.options);

      this.isConnected = true;
      console.log("MongoDB connected successfully");

      // Handle connection events
      this.mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
        this.isConnected = false;
      });

      this.mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      // Handle process termination
      process.on("SIGINT", async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      console.error("MongoDB connection error:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.mongoose.connection.close();
      this.isConnected = false;
      console.log("MongoDB disconnected successfully");
    } catch (error) {
      console.error("Error while disconnecting MongoDB:", error);
      throw error;
    }
  }

  // Helper method to check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      state: this.mongoose.connection.readyState,
    };
  }
}

// Export a singleton instance
module.exports = new Database();
