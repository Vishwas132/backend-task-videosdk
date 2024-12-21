import { describe, it, expect, vi, beforeEach } from "vitest";
import deliveryService from "../src/services/delivery/delivery.service.js";
import emailService from "../src/services/delivery/email.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

// Mock delivery services
vi.mock("../src/services/delivery/email.service.js");
vi.mock("../src/services/delivery/sms.service.js");
vi.mock("../src/services/delivery/push.service.js");

describe("Notification Delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Channel Selection", () => {
    it("should deliver notification through email channel", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Test Email",
        content: "Test content",
        channel: "email",
        status: "pending",
      });

      await deliveryService.deliverNotification(notification);

      expect(emailService.sendWithRetry).toHaveBeenCalledWith(notification);
    });

    it("should handle multiple delivery channels", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Multi-channel Test",
        content: "Test content",
        channel: ["email", "sms"],
        status: "pending",
      });

      await deliveryService.deliverNotification(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.channel).toHaveLength(2);
      expect(deliveryStatus.channel).toContain("email");
      expect(deliveryStatus.channel).toContain("sms");
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

      await deliveryService.deliverNotification(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.status).toBe("failed");
      expect(deliveryStatus.retryCount).toBeGreaterThan(0);
      expect(deliveryStatus.failureReason.message).toBeDefined();
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
