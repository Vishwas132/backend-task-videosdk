import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

describe("Analytics API", () => {
  beforeEach(async () => {
    // Clear collections before each test
    await Notification.deleteMany({});
    await DeliveryStatus.deleteMany({});
  });

  describe("GET /api/analytics", () => {
    it("should return delivery statistics", async () => {
      // Create test data
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          status: "delivered",
          deliveredAt: new Date(),
          retryCount: 0,
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          status: "failed",
          retryCount: 3,
          lastError: "Delivery failed",
        }),
        DeliveryStatus.create({
          notificationId: "notification3",
          status: "delivered",
          deliveredAt: new Date(),
          retryCount: 2,
        }),
      ]);

      const response = await request(app).get("/api/analytics").expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        totalNotifications: 3,
        deliveredCount: 2,
        failedCount: 1,
        retryCount: 5, // Total retries across all notifications
        averageDeliveryTime: expect.any(Number),
      });
    });

    it("should return channel-specific statistics", async () => {
      // Create test data for different channels
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          status: "delivered",
          channel: "email",
          deliveredAt: new Date(),
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          status: "delivered",
          channel: "sms",
          deliveredAt: new Date(),
        }),
        DeliveryStatus.create({
          notificationId: "notification3",
          status: "failed",
          channel: "email",
          lastError: "Delivery failed",
        }),
      ]);

      const response = await request(app)
        .get("/api/analytics/channels")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        email: {
          total: 2,
          delivered: 1,
          failed: 1,
        },
        sms: {
          total: 1,
          delivered: 1,
          failed: 0,
        },
      });
    });

    it("should return user engagement metrics", async () => {
      const userId = "test-user";
      const baseTime = new Date();

      // Create test notifications with varying delivery times
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          userId,
          status: "delivered",
          deliveredAt: baseTime,
          responseTime: 2000, // 2 seconds
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          userId,
          status: "delivered",
          deliveredAt: new Date(baseTime.getTime() + 3600000), // 1 hour later
          responseTime: 3000,
        }),
      ]);

      const response = await request(app)
        .get(`/api/analytics/user/${userId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        totalNotifications: 2,
        averageResponseTime: 2500, // (2000 + 3000) / 2
        deliveryTrend: expect.any(Array),
        channelPreferences: expect.any(Object),
      });
    });

    it("should return time-based analytics", async () => {
      const baseTime = new Date();

      // Create test data across different time periods
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          status: "delivered",
          deliveredAt: baseTime,
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          status: "delivered",
          deliveredAt: new Date(baseTime.getTime() + 3600000), // 1 hour later
        }),
        DeliveryStatus.create({
          notificationId: "notification3",
          status: "failed",
          createdAt: new Date(baseTime.getTime() + 7200000), // 2 hours later
        }),
      ]);

      const response = await request(app)
        .get("/api/analytics/timeline")
        .query({
          start: baseTime.toISOString(),
          end: new Date(baseTime.getTime() + 86400000).toISOString(), // 24 hours later
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        timeline: expect.any(Array),
        peakDeliveryTime: expect.any(String),
        quietestPeriod: expect.any(String),
        hourlyDistribution: expect.any(Object),
      });
    });
  });

  describe("GET /api/analytics/performance", () => {
    it("should return system performance metrics", async () => {
      // Create test data with varying processing times
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          status: "delivered",
          processingTime: 150, // milliseconds
          deliveryTime: 500,
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          status: "delivered",
          processingTime: 200,
          deliveryTime: 600,
        }),
      ]);

      const response = await request(app)
        .get("/api/analytics/performance")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        averageProcessingTime: 175, // (150 + 200) / 2
        averageDeliveryTime: 550,
        successRate: 100,
        throughput: expect.any(Number),
      });
    });
  });

  describe("GET /api/analytics/errors", () => {
    it("should return error statistics and patterns", async () => {
      // Create test data with various error types
      await Promise.all([
        DeliveryStatus.create({
          notificationId: "notification1",
          status: "failed",
          error: "Network timeout",
          errorCode: "NETWORK_ERROR",
        }),
        DeliveryStatus.create({
          notificationId: "notification2",
          status: "failed",
          error: "Invalid email",
          errorCode: "VALIDATION_ERROR",
        }),
        DeliveryStatus.create({
          notificationId: "notification3",
          status: "failed",
          error: "Network timeout",
          errorCode: "NETWORK_ERROR",
        }),
      ]);

      const response = await request(app)
        .get("/api/analytics/errors")
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toMatchObject({
        totalErrors: 3,
        errorTypes: {
          NETWORK_ERROR: 2,
          VALIDATION_ERROR: 1,
        },
        commonPatterns: expect.any(Array),
        errorTrend: expect.any(Array),
      });
    });
  });
});
