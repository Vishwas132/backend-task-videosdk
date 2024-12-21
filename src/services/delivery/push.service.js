import config from "../../config/index.js";
import DeliveryStatus from "../../models/deliveryStatus.js";

class PushNotificationService {
  constructor() {
    // In a real implementation, this would be an actual push notification service (e.g., Firebase Cloud Messaging)
    this.mockDeliverySuccess = 0.93; // 93% success rate for simulation
  }

  /**
   * Send a push notification
   * @param {Object} notification The notification to send
   * @returns {Promise<Object>} Delivery result
   */
  async sendPushNotification(notification) {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 300));

    // Simulate random success/failure
    const isSuccess = Math.random() < this.mockDeliverySuccess;

    if (!isSuccess) {
      throw new Error("Mock push notification delivery failed");
    }

    // Generate mock push notification metadata
    const messageId = `push_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      messageId,
      timestamp: new Date(),
      status: "delivered",
    };
  }

  /**
   * Send a notification with retry mechanism
   * @param {Object} notification The notification to send
   * @returns {Promise<void>}
   */
  async sendWithRetry(notification) {
    let lastError;
    let deliveryStatus = await DeliveryStatus.findOne({
      notificationId: notification._id,
    });

    // Create delivery status if it doesn't exist
    if (!deliveryStatus) {
      deliveryStatus = new DeliveryStatus({
        notificationId: notification._id,
        userId: notification.userId,
        status: "pending",
        channel: ["push"],
        lastAttemptAt: new Date(),
        deliveryAttempts: [],
      });
    }

    // Try sending the push notification with retries
    for (let attempt = 0; attempt < config.kafka.maxRetries; attempt++) {
      try {
        const result = await this.sendPushNotification(notification);

        // Update delivery status on success
        deliveryStatus.status = "delivered";
        deliveryStatus.deliveredAt = new Date();
        deliveryStatus.pushMetadata = {
          messageId: result.messageId,
        };

        // Add successful attempt
        deliveryStatus.deliveryAttempts.push({
          timestamp: new Date(),
          status: "success",
          metadata: {
            messageId: result.messageId,
          },
        });

        await deliveryStatus.save();
        return;
      } catch (error) {
        lastError = error;
        console.error(
          `Push notification delivery attempt ${attempt + 1} failed:`,
          error
        );

        // Add failed attempt
        deliveryStatus.deliveryAttempts.push({
          timestamp: new Date(),
          status: "failure",
          errorMessage: error.message,
        });

        // Update status for retry
        deliveryStatus.status = "failed";
        deliveryStatus.lastAttemptAt = new Date();
        deliveryStatus.failureReason = {
          code: "DELIVERY_FAILED",
          message: error.message,
        };

        await deliveryStatus.save();

        // Wait before retrying (exponential backoff)
        if (attempt < config.kafka.maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError;
  }
}

// Export singleton instance
export default new PushNotificationService();
