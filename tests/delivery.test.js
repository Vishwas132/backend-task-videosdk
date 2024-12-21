import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeliveryService } from "../src/services/delivery/delivery.service.js";
import { EmailService } from "../src/services/delivery/email.service.js";
import Notification from "../src/models/notification.js";
import DeliveryStatus from "../src/models/deliveryStatus.js";

// Mock delivery services
vi.mock("../src/services/delivery/email.service.js");
vi.mock("../src/services/delivery/sms.service.js");
vi.mock("../src/services/delivery/push.service.js");

describe("Notification Delivery", () => {
  let deliveryService;

  beforeEach(() => {
    deliveryService = new DeliveryService();
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

      await deliveryService.deliver(notification);

      expect(EmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.any(String),
          subject: notification.title,
          content: notification.content,
        })
      );
    });

    it("should handle multiple delivery channels", async () => {
      const notification = await Notification.create({
        userId: "test-user",
        title: "Multi-channel Test",
        content: "Test content",
        channels: ["email", "sms"],
        status: "pending",
      });

      await deliveryService.deliver(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.channels).toHaveLength(2);
      expect(deliveryStatus.channels).toContain("email");
      expect(deliveryStatus.channels).toContain("sms");
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
      EmailService.send.mockRejectedValueOnce(new Error("Delivery failed"));
      // Mock second attempt success
      EmailService.send.mockResolvedValueOnce({ success: true });

      await deliveryService.deliver(notification);

      expect(EmailService.send).toHaveBeenCalledTimes(2);
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
      EmailService.send.mockRejectedValue(new Error("Delivery failed"));

      await deliveryService.deliver(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.status).toBe("failed");
      expect(deliveryStatus.retryCount).toBeGreaterThan(0);
      expect(deliveryStatus.lastError).toBeDefined();
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

      EmailService.send.mockResolvedValueOnce({ success: true });

      await deliveryService.deliver(notification);

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
      EmailService.send.mockRejectedValueOnce(error);
      EmailService.send.mockResolvedValueOnce({ success: true });

      await deliveryService.deliver(notification);

      const deliveryStatus = await DeliveryStatus.findOne({
        notificationId: notification._id,
      });
      expect(deliveryStatus.attempts).toHaveLength(2);
      expect(deliveryStatus.attempts[0].error).toBeDefined();
      expect(deliveryStatus.attempts[1].success).toBe(true);
    });
  });
});
