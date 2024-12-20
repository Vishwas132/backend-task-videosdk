import { config as _config } from "dotenv";

// Load environment variables
_config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/notification-system",
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    clientId: process.env.KAFKA_CLIENT_ID || "notification-service",
    groupId: process.env.KAFKA_GROUP_ID || "notification-group",
    topics: {
      notifications: "notifications",
      deliveryStatus: "delivery-status",
    },
  },

  email: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525", 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
    index: process.env.ELASTICSEARCH_INDEX || "notifications",
  },

  // Notification settings
  notification: {
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 100,
    defaultPriority: "medium",
    priorities: ["low", "medium", "high", "urgent"],
  },

  // User preferences defaults
  userPreferences: {
    defaultQuietHours: {
      start: "22:00",
      end: "07:00",
    },
    defaultThrottleLimit: 10, // notifications per hour
  },
};

export default config;
