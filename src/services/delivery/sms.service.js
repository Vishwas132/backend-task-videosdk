import config from "../../config/index.js";
import DeliveryStatus from "../../models/deliveryStatus.js";

class SmsService {
  constructor() {
    // In a real implementation, this would be an actual SMS client (e.g., Twilio)
    this.mockDeliverySuccess = 0.95; // 95% success rate for simulation
  }

  /**
   * Send an SMS notification
   * @param {Object} notification The notification to send
   * @returns {Promise<Object>} Delivery result
   */
  async sendSms(notification) {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));

    // Simulate random success/failure
    const isSuccess = Math.random() < this.mockDeliverySuccess;

    if (!isSuccess) {
      throw new Error("Mock SMS delivery failed");
    }

    // Generate mock SMS metadata
    const messageId = `sms_${Date.now()}_${Math.random()
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
        channel: ["sms"],
        lastAttemptAt: new Date(),
        deliveryAttempts: [],
      });
    }

    // Try sending the SMS with retries
    for (let attempt = 0; attempt < config.kafka.maxRetries; attempt++) {
      try {
        const result = await this.sendSms(notification);

        // Update delivery status on success
        deliveryStatus.status = "delivered";
        deliveryStatus.deliveredAt = new Date();
        deliveryStatus.smsMetadata = {
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
        console.error(`SMS delivery attempt ${attempt + 1} failed:`, error);

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
export default new SmsService();
