import { Kafka } from "kafkajs";
import config from "../../config/index.js";

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });

    this.producer = this.kafka.producer();
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log("Kafka producer connected successfully");

      // Handle disconnections
      this.producer.on("producer.disconnect", () => {
        console.warn("Kafka producer disconnected");
        this.isConnected = false;
      });
    } catch (error) {
      console.error("Error connecting to Kafka:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log("Kafka producer disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Kafka producer:", error);
      throw error;
    }
  }

  async publishToKafka(topic, message) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.notificationId.toString(),
            value: JSON.stringify(message),
            headers: {
              priority: message.priority,
              timestamp: Date.now().toString(),
            },
          },
        ],
      });

      console.log(`Message published to Kafka topic ${topic}:`, {
        notificationId: message.notificationId,
        priority: message.priority,
      });
    } catch (error) {
      console.error(`Error publishing message to Kafka topic ${topic}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const kafkaProducer = new KafkaProducer();

// Handle process termination
process.on("SIGINT", async () => {
  await kafkaProducer.disconnect();
  process.exit(0);
});

export function publishToKafka(topic, message) {
  return kafkaProducer.publishToKafka(topic, message);
}
