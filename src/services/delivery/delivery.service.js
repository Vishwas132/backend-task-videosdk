import emailService from "./email.service.js";
import Notification from "../../models/notification.js";
import DeliveryStatus from "../../models/deliveryStatus.js";

class DeliveryService {
  constructor() {
    // Map of delivery handlers for different channels
    this.deliveryHandlers = {
      email: this.#handleEmailDelivery,
      // Add other channel handlers here as they're implemented
      // sms: this.handleSmsDelivery.bind(this),
      // push: this.handlePushDelivery.bind(this),
    };
  }

  /**
   * Deliver a notification through the appropriate channel
   */
  async deliverNotification(notification) {
    const handler = this.deliveryHandlers[notification.channel];

    if (!handler) {
      throw new Error(`Unsupported delivery channel: ${notification.channel}`);
    }

    try {
      // Update notification status to processing
      await Notification.findByIdAndUpdate(notification._id, {
        status: "processing",
      });

      // Attempt delivery
      await handler(notification);

      // Update notification status to delivered
      await Notification.findByIdAndUpdate(notification._id, {
        status: "delivered",
      });
    } catch (error) {
      console.error(
        `Delivery failed for notification ${notification._id}:`,
        error
      );

      // Update notification status to failed
      await Notification.findByIdAndUpdate(notification._id, {
        status: "failed",
        $inc: { retryCount: 1 },
        lastRetryAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Handle email delivery for a notification
   * @private
   */
  #handleEmailDelivery = async (notification) => {
    try {
      await emailService.sendWithRetry(notification);
    } catch (error) {
      // Create or update delivery status for failed delivery
      await DeliveryStatus.findOneAndUpdate(
        { notificationId: notification._id },
        {
          $set: {
            status: "failed",
            lastAttemptAt: new Date(),
            failureReason: {
              code: "EMAIL_DELIVERY_FAILED",
              message: error.message,
            },
          },
        },
        { upsert: true }
      );

      throw error;
    }
  };

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(notificationId) {
    const [notification, deliveryStatus] = await Promise.all([
      Notification.findById(notificationId),
      DeliveryStatus.findOne({ notificationId }),
    ]);

    if (!notification) {
      throw new Error("Notification not found");
    }

    return {
      notificationId,
      status: notification.status,
      channel: notification.channel,
      retryCount: notification.retryCount,
      lastRetryAt: notification.lastRetryAt,
      deliveryDetails: deliveryStatus
        ? {
            attempts: deliveryStatus.deliveryAttempts.length,
            lastAttempt: deliveryStatus.lastAttemptAt,
            deliveredAt: deliveryStatus.deliveredAt,
            failureReason: deliveryStatus.failureReason,
          }
        : null,
    };
  }
}

// Export singleton instance
export default new DeliveryService();
