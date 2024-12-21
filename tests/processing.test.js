import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationProcessor } from "../src/services/processing/notification.processor.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

vi.mock("../src/services/delivery/delivery.service.js");

describe("Notification Processing", () => {
  let processor;

  beforeEach(() => {
    processor = new NotificationProcessor();
  });

  describe("Real-time vs Scheduled Processing", () => {
    it("should process high-priority notifications immediately", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Urgent Alert",
        content: "Critical system error",
        priority: "high",
        status: "pending",
      });

      await processor.processNotification(notification);

      const status = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(status.status).toBe("processed");
      expect(status.processedAt).toBeDefined();
    });

    it("should schedule non-urgent notifications", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const notification = await Notification.create({
        userId: "test-user",
        title: "Regular Update",
        content: "System status update",
        priority: "low",
        scheduledFor: futureTime,
        status: "pending",
      });

      await processor.processNotification(notification);

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe("scheduled");
      expect(updatedNotification.scheduledFor).toEqual(futureTime);
    });
  });

  describe("Notification Deduplication", () => {
    it("should detect and handle duplicate notifications", async () => {
      // Create original notification
      await Notification.create({
        userId: "test-user",
        title: "Error Alert",
        content: "Service XYZ is down",
        priority: "high",
        status: "delivered",
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      });

      // Try to create duplicate notification
      const duplicateNotification = await Notification.create({
        userId: "test-user",
        title: "Error Alert",
        content: "Service XYZ is down",
        priority: "high",
        status: "pending",
      });

      const isDuplicate = await processor.checkDuplication(
        duplicateNotification
      );
      expect(isDuplicate).toBe(true);
    });

    it("should not mark different notifications as duplicates", async () => {
      // Create original notification
      await Notification.create({
        userId: "test-user",
        title: "Error Alert",
        content: "Service XYZ is down",
        priority: "high",
        status: "delivered",
        createdAt: new Date(Date.now() - 1800000),
      });

      // Create different notification
      const differentNotification = await Notification.create({
        userId: "test-user",
        title: "Error Alert",
        content: "Service ABC is down", // Different content
        priority: "high",
        status: "pending",
      });

      const isDuplicate = await processor.checkDuplication(
        differentNotification
      );
      expect(isDuplicate).toBe(false);
    });
  });

  describe("Notification Aggregation", () => {
    it("should aggregate low-priority notifications in the same hour", async () => {
      const baseTime = new Date();
      const notifications = await Promise.all([
        Notification.create({
          userId: "test-user",
          title: "Update 1",
          content: "System update 1",
          priority: "low",
          scheduledFor: baseTime,
          status: "pending",
        }),
        Notification.create({
          userId: "test-user",
          title: "Update 2",
          content: "System update 2",
          priority: "low",
          scheduledFor: new Date(baseTime.getTime() + 30 * 60000), // 30 minutes later
          status: "pending",
        }),
      ]);

      const aggregatedNotification = await processor.aggregateNotifications(
        notifications
      );
      expect(aggregatedNotification.content).toContain("System update 1");
      expect(aggregatedNotification.content).toContain("System update 2");
      expect(aggregatedNotification.type).toBe("aggregated");
    });
  });
});
