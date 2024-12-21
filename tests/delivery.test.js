import { describe, it, expect, vi, beforeEach } from "vitest";
import deliveryService from "../src/services/delivery/delivery.service.js";
import emailService from "../src/services/delivery/email.service.js";
import smsService from "../src/services/delivery/sms.service.js";
import pushService from "../src/services/delivery/push.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";
import UserPreference from "../src/models/userPreference.js";

// Mock delivery services
vi.mock("../src/services/delivery/email.service.js");
vi.mock("../src/services/delivery/sms.service.js");
vi.mock("../src/services/delivery/push.service.js");

describe("Notification Delivery", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await Notification.deleteMany({});
    await DeliveryStatus.deleteMany({});
    await UserPreference.deleteMany({});
  });

  describe("Channel-specific Delivery", () => {
    it("should deliver through email channel", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Email Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      emailService.sendWithRetry.mockResolvedValueOnce({ success: true });
      await deliveryService.deliverNotification(notification);

      expect(emailService.sendWithRetry).toHaveBeenCalledWith(notification);
      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.channel).toBe("email");
      expect(deliveryStatus.status).toBe("delivered");
    });

    it("should deliver through SMS channel", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "SMS Test",
        content: "Test content",
        channel: "sms",
        status: "pending",
      });

      smsService.sendWithRetry.mockResolvedValueOnce({ success: true });
      await deliveryService.deliverNotification(notification);

      expect(smsService.sendWithRetry).toHaveBeenCalledWith(notification);
      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.channel).toBe("sms");
      expect(deliveryStatus.status).toBe("delivered");
    });

    it("should deliver through push notification channel", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Push Test",
        content: "Test content",
        channel: "push",
        status: "pending",
      });

      pushService.sendWithRetry.mockResolvedValueOnce({ success: true });
      await deliveryService.deliverNotification(notification);

      expect(pushService.sendWithRetry).toHaveBeenCalledWith(notification);
      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.channel).toBe("push");
      expect(deliveryStatus.status).toBe("delivered");
    });

    it("should throw error for unsupported channel", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Invalid Channel Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      // Modify the channel after creation to simulate an invalid channel
      notification.channel = "invalid";

      await expect(
        deliveryService.deliverNotification(notification)
      ).rejects.toThrow("Unsupported delivery channel: invalid");
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed deliveries", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Retry Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      // Mock first attempt failure
      emailService.sendWithRetry.mockRejectedValueOnce(
        new Error("Delivery failed")
      );
      // Mock second attempt success
      emailService.sendWithRetry.mockResolvedValueOnce({ success: true });

      await deliveryService.deliverNotification(notification);

      expect(emailService.sendWithRetry).toHaveBeenCalledTimes(2);
      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.retryCount).toBe(1);
      expect(deliveryStatus.status).toBe("delivered");
    });

    it("should mark notification as failed after max retries", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Max Retry Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      // Mock all attempts failing
      emailService.sendWithRetry.mockRejectedValue(
        new Error("Delivery failed")
      );

      // Expect the delivery to throw an error after max retries
      await expect(
        deliveryService.deliverNotification(notification)
      ).rejects.toThrow("Delivery failed");

      // But the notification and delivery status should be marked as failed
      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.status).toBe("failed");
      expect(deliveryStatus.retryCount).toBe(2); // Incremented for each failed attempt
      expect(deliveryStatus.deliveryAttempts).toHaveLength(2); // Initial attempt + 1 retry
      expect(deliveryStatus.failureReason.message).toBe("Delivery failed");

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe("failed");
    });
  });

  describe("Delivery Status Logging", () => {
    it("should log successful delivery status", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Logging Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      emailService.sendWithRetry.mockResolvedValueOnce({ success: true });

      await deliveryService.deliverNotification(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.status).toBe("delivered");
      expect(deliveryStatus.deliveredAt).toBeDefined();
      expect(deliveryStatus.retryCount).toBe(0);
    });

    it("should log delivery attempts and errors", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Error Logging Test",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      const error = new Error("Temporary failure");
      emailService.sendWithRetry.mockRejectedValueOnce(error);
      emailService.sendWithRetry.mockResolvedValueOnce({ success: true });

      await deliveryService.deliverNotification(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.deliveryAttempts).toHaveLength(2);
      expect(deliveryStatus.deliveryAttempts[0].errorMessage).toBeDefined();
      expect(deliveryStatus.deliveryAttempts[1].status).toBe("success");
    });
  });
});
