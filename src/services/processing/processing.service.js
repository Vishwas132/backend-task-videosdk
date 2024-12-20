import kafkaConsumer from "./kafka.consumer.service.js";
import { processScheduledNotifications } from "./notification.processor.service.js";
import database from "../../utils/database.js";

class ProcessingService {
  constructor() {
    this.isRunning = false;
    this.schedulerInterval = null;
  }

  async start() {
    if (this.isRunning) {
      console.log("Processing service is already running");
      return;
    }

    try {
      // Connect to database
      await database.connect();

      // Start Kafka consumer
      await kafkaConsumer.subscribe();

      // Start scheduler for processing scheduled notifications
      this.schedulerInterval = setInterval(
        () => {
          processScheduledNotifications().catch((error) => {
            console.error("Error processing scheduled notifications:", error);
          });
        },
        5000 // Run every 5 seconds
      );

      this.isRunning = true;
      console.log("Processing service started successfully");
    } catch (error) {
      console.error("Failed to start processing service:", error);
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop scheduler
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }

      // Disconnect Kafka consumer
      await kafkaConsumer.disconnect();

      // Disconnect from database
      await database.disconnect();

      this.isRunning = false;
      console.log("Processing service stopped successfully");
    } catch (error) {
      console.error("Error stopping processing service:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      database: database.getConnectionStatus(),
      kafka: kafkaConsumer.isConnected,
      scheduler: !!this.schedulerInterval,
    };
  }
}

// Create singleton instance
const processingService = new ProcessingService();

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Shutting down processing service...");
  await processingService.stop();
  process.exit(0);
});

export default processingService;
