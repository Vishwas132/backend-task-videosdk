import emailService from "./email.service.js";
import smsService from "./sms.service.js";
import pushService from "./push.service.js";
import Notification from "../../models/notification.js";
import DeliveryStatus from "../../models/deliveryStatus.js";

class DeliveryService {
  constructor() {
    // Map of delivery handlers for different channels
    this.deliveryHandlers = {
      email: this.#handleEmailDelivery,
      sms: this.#handleSmsDelivery,
      push: this.#handlePushDelivery,
    };
  }

  /**
   * Deliver a notification through the specified channels
   */
  async deliverNotification(notification) {
    const channel = notification.channel;
    const handler = this.deliveryHandlers[channel];
    if (!handler) {
      throw new Error(`Unsupported delivery channel: ${channel}`);
    }

    // Create initial delivery status
    let deliveryStatus = await DeliveryStatus.create({
      notificationId: notification._id,
      userId: notification.userId,
      status: "processing",
      channel: channel,
      deliveryAttempts: [],
      lastAttemptAt: new Date(),
      retryCount: 0,
    });

    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        const startTime = Date.now();
        await handler(notification);
        const endTime = Date.now();

        await DeliveryStatus.addDeliveryAttempt(deliveryStatus._id, {
          status: "success",
          metadata: { channel },
          processingTime: endTime - startTime,
          deliveryTime: 0, // Could be obtained from handler response if available
        });

        // Update notification status to delivered
        await Notification.findByIdAndUpdate(notification._id, {
          status: "delivered",
          deliveredAt: new Date(),
        });
        return;
      } catch (error) {
        console.error(
          `Delivery failed for notification ${notification._id} on channel ${channel}:`,
          error
        );

        await DeliveryStatus.addDeliveryAttempt(deliveryStatus._id, {
          status: "failure",
          errorCode: error.code || "DELIVERY_ERROR",
          errorMessage: error.message,
          metadata: {
            channel,
            errorDetails: error.details || {},
            timestamp: new Date(),
          },
        });

        retryCount++;

        if (retryCount === MAX_RETRIES) {
          await deliveryStatus.updateOne({
            status: "failed",
            failureReason: { message: error.message },
          });

          await Notification.findByIdAndUpdate(notification._id, {
            status: "failed",
            error: error.message,
          });

          throw error;
        }

        // Fixed delay for tests, exponential backoff for production
        const delay =
          process.env.NODE_ENV === "test"
            ? 100
            : Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Handle email delivery for a notification
   * @private
   */
  #handleEmailDelivery = async (notification) => {
    return emailService.sendWithRetry(notification);
  };

  /**
   * Handle SMS delivery for a notification
   * @private
   */
  #handleSmsDelivery = async (notification) => {
    return smsService.sendWithRetry(notification);
  };

  /**
   * Handle push notification delivery
   * @private
   */
  #handlePushDelivery = async (notification) => {
    return pushService.sendWithRetry(notification);
  };

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(notificationId) {
    const deliveryStatus = await DeliveryStatus.findOne({
      notificationId,
    }).exec();
    if (!deliveryStatus) {
      throw new Error("Delivery status not found");
    }

    return {
      notificationId,
      status: deliveryStatus.status,
      channel: deliveryStatus.channel,
      retryCount: deliveryStatus.retryCount,
      lastAttemptAt: deliveryStatus.lastAttemptAt,
      attempts: deliveryStatus.deliveryAttempts,
      deliveredAt: deliveryStatus.deliveredAt,
      failureReason: deliveryStatus.failureReason,
    };
  }
}

// Export singleton instance
export default new DeliveryService();
