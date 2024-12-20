import { Kafka } from "kafkajs";
import { kafka } from "../../config";
import { processNotification } from "./notificationProcessor";

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: kafka.clientId,
      brokers: kafka.brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: kafka.groupId,
    });
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log("Kafka consumer connected successfully");

      // Handle disconnections
      this.consumer.on("consumer.disconnect", () => {
        console.warn("Kafka consumer disconnected");
        this.isConnected = false;
      });
    } catch (error) {
      console.error("Error connecting Kafka consumer:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log("Kafka consumer disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Kafka consumer:", error);
      throw error;
    }
  }

  async subscribe() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Subscribe to notifications topic
      await this.consumer.subscribe({
        topic: kafka.topics.notifications,
        fromBeginning: false,
      });

      // Start processing messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const notification = JSON.parse(message.value.toString());
            const priority = message.headers.priority?.toString() || "medium";

            console.log(`Processing notification:`, {
              notificationId: notification.notificationId,
              priority,
              partition,
            });

            await processNotification(notification, priority);
          } catch (error) {
            console.error("Error processing message:", error);
            // Here we could implement dead letter queue logic
            // For now, we'll just log the error
          }
        },
      });

      console.log("Kafka consumer started processing messages");
    } catch (error) {
      console.error("Error in Kafka consumer subscription:", error);
      throw error;
    }
  }
}

// Create singleton instance
const kafkaConsumer = new KafkaConsumer();

// Handle process termination
process.on("SIGINT", async () => {
  await kafkaConsumer.disconnect();
  process.exit(0);
});

export default kafkaConsumer;
