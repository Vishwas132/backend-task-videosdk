import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Kafka } from "kafkajs";
import kafkaProducer from "../src/services/ingestion/kafka.producer.service.js";
import { startConsumer } from "../src/services/processing/kafka.consumer.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

import config from "../src/config/index.js";
import "../tests/setup.js"; // Import test setup for MongoDB

describe("Kafka Integration", () => {
  let kafka;
  let producer;
  const topic = config.kafka.topics.notifications;

  // Helper function to create and setup a consumer
  const createConsumer = async (groupIdSuffix = "") => {
    const consumer = kafka.consumer({
      groupId: config.kafka.groupId + "-test" + groupIdSuffix,
    });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    return consumer;
  };

  // Helper function to cleanup a consumer
  const cleanupConsumer = async (consumer) => {
    try {
      await consumer.disconnect();
    } catch (error) {
      console.error("Error cleaning up consumer:", error);
    }
  };

  beforeAll(async () => {
    // Create Kafka client using config
    kafka = new Kafka({
      clientId: config.kafka.clientId + "-test",
      brokers: config.kafka.brokers,
    });

    // Create producer
    producer = kafka.producer();
    await producer.connect();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await DeliveryStatus.deleteMany({});

    // Clear the topic by creating a temporary admin client
    const admin = kafka.admin();
    await admin.connect();
    try {
      // Delete and recreate the topic to ensure it's empty
      await admin.deleteTopics({
        topics: [topic],
        timeout: 5000,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for deletion
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
        timeout: 5000,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for creation
    } finally {
      await admin.disconnect();
    }
  });

  afterAll(async () => {
    await producer.disconnect();
  });

  describe("Producer-Consumer Flow", () => {
    const TEST_TIMEOUT = 30000; // 30 seconds timeout for async operations

    it(
      "should successfully publish and consume notification messages",
      async () => {
        const notification = {
          notificationId: "test-notification-1",
          userId: "test-user",
          title: "Test Notification",
          content: "Test content",
          priority: "high",
          channel: "email",
        };

        let consumerRunning = false;
        const consumer = await createConsumer();
        try {
          // Set up consumer first and ensure it's running
          const messageConsumed = new Promise((resolve, reject) => {
            consumer
              .run({
                eachMessage: async ({ message }) => {
                  try {
                    const consumedNotification = JSON.parse(
                      message.value.toString()
                    );

                    // Validate all required fields
                    expect(consumedNotification).toEqual(notification);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                },
              })
              .then(() => {
                consumerRunning = true;
              });
          });

          // Wait for consumer to be ready before publishing
          while (!consumerRunning) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Publish the notification once consumer is ready
          await kafkaProducer.publishToKafka(topic, notification);

          await messageConsumed;
        } finally {
          await cleanupConsumer(consumer);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should handle multiple notifications in order",
      async () => {
        const notifications = [
          {
            notificationId: "test-notification-2",
            userId: "test-user",
            title: "First Notification",
            content: "First content",
            priority: "high",
          },
          {
            notificationId: "test-notification-3",
            userId: "test-user",
            title: "Second Notification",
            content: "Second content",
            priority: "medium",
          },
        ];

        let consumerRunning = false;
        const consumer = await createConsumer();
        try {
          const consumedNotifications = [];
          const allMessagesConsumed = new Promise((resolve) => {
            consumer
              .run({
                eachMessage: async ({ message }) => {
                  const notification = JSON.parse(message.value.toString());

                  consumedNotifications.push(notification);
                  if (consumedNotifications.length === notifications.length) {
                    resolve();
                  }
                },
              })
              .then(() => {
                consumerRunning = true;
              });
          });

          // Wait for consumer to be ready before publishing
          while (!consumerRunning) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Publish notifications
          for (const notification of notifications) {
            await kafkaProducer.publishToKafka(topic, notification);
          }

          // Wait for all messages to be consumed
          await allMessagesConsumed;

          // Verify order and content
          expect(consumedNotifications[0].title).toBe("First Notification");
          expect(consumedNotifications[1].title).toBe("Second Notification");
        } finally {
          await cleanupConsumer(consumer);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should handle consumer group rebalancing",
      async () => {
        const consumer1 = await createConsumer("-1");
        const consumer2 = await createConsumer("-2");

        try {
          const notifications = Array.from({ length: 10 }, (_, i) => ({
            notificationId: `test-notification-${i + 4}`,
            userId: "test-user",
            title: `Test Notification`,
            content: `Content ${i}`,
            priority: "medium",
          }));

          const consumedNotificationIds = new Set();
          let consumer1Running = false;
          let consumer2Running = false;
          const allMessagesConsumed = new Promise((resolve, reject) => {
            // Run both consumers
            consumer1
              .run({
                eachMessage: async ({ message }) => {
                  try {
                    const notification = JSON.parse(message.value.toString());
                    consumedNotificationIds.add(notification.notificationId);
                    if (consumedNotificationIds.size === notifications.length) {
                      resolve();
                    }
                  } catch (error) {
                    console.error("Consumer 1 error:", error);
                    reject(error);
                  }
                },
              })
              .then(() => {
                consumer1Running = true;
              });

            consumer2
              .run({
                eachMessage: async ({ message }) => {
                  try {
                    const notification = JSON.parse(message.value.toString());
                    consumedNotificationIds.add(notification.notificationId);
                    if (consumedNotificationIds.size === notifications.length) {
                      resolve();
                    }
                  } catch (error) {
                    console.error("Consumer 2 error:", error);
                    reject(error);
                  }
                },
              })
              .then(() => {
                consumer2Running = true;
              });
          });

          // Wait for consumer to be ready before publishing
          while (!consumer1Running || !consumer2Running) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Publish all notifications
          for (const notification of notifications) {
            await kafkaProducer.publishToKafka(topic, notification);
          }

          // Wait for all messages to be consumed
          await allMessagesConsumed;

          // Verify all notifications were consumed exactly once
          expect(consumedNotificationIds.size).toBe(notifications.length);
        } finally {
          // Ensure cleanup happens even if test fails
          await cleanupConsumer(consumer1);
          await cleanupConsumer(consumer2);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should handle consumer failures and retries",
      async () => {
        const notification = {
          notificationId: "test-notification-14",
          userId: "test-user",
          title: "Retry Test",
          content: "Test content",
          priority: "high",
        };

        const consumer = await createConsumer();
        try {
          let globalAttempts = 0;
          const maxAttempts = 3;
          const errors = [];
          let consumerRunning = false;

          const messageProcessed = new Promise((resolve, reject) => {
            consumer
              .run({
                eachMessage: async ({ message, partition, topic }) => {
                  try {
                    globalAttempts++;

                    // Track message metadata
                    const messageMetadata = {
                      partition,
                      topic,
                      timestamp: message.timestamp,
                      headers: message.headers,
                      offset: message.offset,
                    };

                    if (globalAttempts < maxAttempts) {
                      const error = new Error("Simulated failure");
                      errors.push(error);
                      throw error;
                    }

                    const consumedNotification = JSON.parse(
                      message.value.toString()
                    );

                    // Enhanced validation
                    expect(consumedNotification).toMatchObject({
                      userId: notification.userId,
                      title: notification.title,
                      content: notification.content,
                      priority: notification.priority,
                    });

                    // Validate message metadata
                    expect(messageMetadata.topic).toBe("notifications");
                    expect(messageMetadata.partition).toBeGreaterThanOrEqual(0);
                    expect(messageMetadata.timestamp).toBeDefined();
                    expect(messageMetadata.offset).toBeDefined();
                    expect(messageMetadata.headers).toBeDefined();

                    resolve(messageMetadata);
                  } catch (error) {
                    if (globalAttempts >= maxAttempts) {
                      reject(error);
                    }
                    // Let it retry if attempts < maxAttempts
                    throw error; // Re-throw to ensure proper error handling
                  }
                },
              })
              .then(() => {
                consumerRunning = true;
              });
          });

          // Wait for consumer to be ready before publishing
          while (!consumerRunning) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          await kafkaProducer.publishToKafka(topic, notification);
          const metadata = await messageProcessed;

          // Validate retry behavior
          expect(globalAttempts).toBe(maxAttempts);
          expect(errors).toHaveLength(maxAttempts - 1);
          expect(errors.every((e) => e.message === "Simulated failure")).toBe(
            true
          );
          expect(metadata).toBeDefined();
          expect(metadata.headers).toBeDefined();
        } finally {
          await cleanupConsumer(consumer);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe("Error Handling", () => {
    const TEST_TIMEOUT = 10000;

    it(
      "should handle producer disconnection gracefully",
      async () => {
        await producer.disconnect();

        // Attempt to publish should throw an error
        await expect(
          await kafkaProducer.publishToKafka(topic, {
            notificationId: "test-notification-15",
            userId: "test-user",
            title: "Test",
            content: "Content",
          })
        ).rejects.toThrow("Producer is not connected");

        // Reconnect for cleanup
        await producer.connect();
      },
      TEST_TIMEOUT
    );

    it(
      "should handle invalid message formats",
      async () => {
        const invalidNotifications = [
          {
            userId: "test-user",
            // Missing title and content
          },
          {
            notificationId: "test-notification-16",
            // Missing userId
            title: "Test",
            content: "Content",
          },
          {
            notificationId: "test-notification-17",
            userId: "test-user",
            title: "", // Empty title
            content: "Content",
          },
        ];

        for (const invalidNotification of invalidNotifications) {
          await expect(
            kafkaProducer.publishToKafka(topic, invalidNotification)
          ).rejects.toThrow(/Invalid notification format/);
        }
      },
      TEST_TIMEOUT
    );
  });
});
