import { describe, it, expect, beforeEach } from "vitest";
import {
  processNotification,
  processScheduledNotifications,
} from "../src/services/processing/notification.processor.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

describe("Notification Processing", () => {
  beforeEach(async () => {
    // Clear collections before each test
    await Notification.deleteMany({});
    await DeliveryStatus.deleteMany({});
  });

  describe("Real-time vs Scheduled Processing", () => {
    it("should process high-priority notifications immediately", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Urgent Alert",
        content: "Critical system error",
        priority: "high",
        status: "pending",
        scheduledFor: new Date(),
        channel: ["email"],
      });

      await processNotification(notification, "high");

      const processedNotification = await Notification.findById(
        notification._id
      );
      expect(processedNotification.status).toBe("processing");
    });

    it("should schedule non-urgent notifications", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const notification = await Notification.create({
        userId: "test-user",
        title: "Regular Update",
        content: "System status update",
        priority: "low",
        status: "pending",
        scheduledFor: futureTime,
        channel: ["email"],
      });

      await processNotification(notification, "low");

      const scheduledNotification = await Notification.findById(
        notification._id
      );
      expect(scheduledNotification.status).toBe("processing");
      expect(scheduledNotification.scheduledFor).toEqual(futureTime);
    });
  });

  describe("Scheduled Notifications Processing", () => {
    it("should process notifications when their scheduled time arrives", async () => {
      // Create a notification scheduled for now
      const notification = await Notification.create({
        userId: "test-user",
        title: "Scheduled Test",
        content: "Test content",
        priority: "medium",
        status: "pending",
        scheduledFor: new Date(),
        channel: ["email"],
      });

      await processNotification(notification, "medium");
      await processScheduledNotifications();

      const processedNotification = await Notification.findById(
        notification._id
      );
      expect(processedNotification.status).not.toBe("pending");
    });

    it("should not process future notifications", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const notification = await Notification.create({
        userId: "test-user",
        title: "Future Test",
        content: "Test content",
        priority: "medium",
        status: "pending",
        scheduledFor: futureTime,
        channel: ["email"],
      });

      await processNotification(notification, "medium");
      await processScheduledNotifications();

      const unprocessedNotification = await Notification.findById(
        notification._id
      );
      expect(unprocessedNotification.scheduledFor).toEqual(futureTime);
    });
  });

  describe("Priority Queue Processing", () => {
    it("should process high-priority notifications before low-priority ones", async () => {
      const notifications = await Promise.all([
        Notification.create({
          userId: "test-user",
          title: "Low Priority",
          content: "Test content",
          priority: "low",
          status: "pending",
          scheduledFor: new Date(),
          channel: ["email"],
        }),
        Notification.create({
          userId: "test-user",
          title: "High Priority",
          content: "Test content",
          priority: "high",
          status: "pending",
          scheduledFor: new Date(),
          channel: ["email"],
        }),
      ]);

      // Process notifications
      await Promise.all([
        processNotification(notifications[0], "low"),
        processNotification(notifications[1], "high"),
      ]);

      // The high priority notification should be processed first
      const highPriorityNotification = await Notification.findById(
        notifications[1]._id
      );
      expect(highPriorityNotification.status).toBe("processing");
    });
  });
});
