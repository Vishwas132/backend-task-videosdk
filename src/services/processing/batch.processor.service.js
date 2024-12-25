import config from "../../config/index.js";
import Notification from "../../models/notification.js";
import UserPreference from "../../models/userPreference.js";
import { NotificationSearchService } from "./notification.search.service.js";
import elasticsearchClient from "../../utils/elasticsearch.js";

class BatchProcessorService {
  constructor() {
    this.searchService = null;
    this.batchInterval = null;
  }

  async initialize() {
    const client = await elasticsearchClient.connect();
    this.searchService = new NotificationSearchService(client);
  }

  async start() {
    if (this.batchInterval) {
      console.log("Batch processor already running");
      return;
    }

    // Run batch processing every hour
    this.batchInterval = setInterval(
      () => this.processBatch().catch(console.error),
      60 * 60 * 1000 // 1 hour
    );

    console.log("Batch processor started");
  }

  async stop() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
      console.log("Batch processor stopped");
    }
  }

  async processBatch() {
    try {
      const users = await UserPreference.find({}).select("userId");

      for (const user of users) {
        await this.processUserNotifications(user.userId);
      }
    } catch (error) {
      console.error("Error in batch processing:", error);
    }
  }

  async processUserNotifications(userId) {
    try {
      // Get user preferences
      const userPrefs = await UserPreference.findOne({ userId });
      if (!userPrefs) {
        console.log(`No preferences found for user ${userId}`);
        return;
      }

      // Aggregate low-priority notifications
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const aggregatedNotifications =
        await this.searchService.aggregateSimilarNotifications(
          userId,
          timeWindow
        );

      if (aggregatedNotifications.length <= 1) {
        return; // Nothing to aggregate
      }

      // Create summary notification
      const summary = {
        userId,
        title: "Notification Summary",
        content: this.createSummaryContent(aggregatedNotifications),
        priority: "low",
        type: "summary",
        scheduledFor: this.calculateNextDeliveryTime(userPrefs),
      };

      // Save summary notification
      const notification = new Notification(summary);
      await notification.save();

      // Mark original notifications as processed
      const notificationIds = aggregatedNotifications.map((n) => n._id);
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        {
          status: "aggregated",
          processedAt: new Date(),
        }
      );

      console.log(`Created summary notification for user ${userId}`);
    } catch (error) {
      console.error(
        `Error processing notifications for user ${userId}:`,
        error
      );
    }
  }

  createSummaryContent(notifications) {
    return `You have ${notifications.length} notifications:\n\n${notifications
      .map((n) => `- ${n.content}`)
      .join("\n")}`;
  }

  calculateNextDeliveryTime(userPrefs) {
    const now = new Date();

    // If quiet hours are enabled, ensure delivery during active hours
    if (userPrefs.quietHours?.enabled) {
      const quietStart = this.parseTime(userPrefs.quietHours.start);
      const quietEnd = this.parseTime(userPrefs.quietHours.end);

      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      // If current time is within quiet hours, schedule for the end of quiet hours
      if (
        this.isWithinQuietHours(
          currentHour,
          currentMinutes,
          quietStart,
          quietEnd
        )
      ) {
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + (quietEnd.hours < currentHour ? 1 : 0));
        nextDay.setHours(quietEnd.hours, quietEnd.minutes, 0, 0);
        return nextDay;
      }
    }

    // If not in quiet hours, schedule for the next hour
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hours, minutes };
  }

  isWithinQuietHours(currentHour, currentMinutes, quietStart, quietEnd) {
    const current = currentHour * 60 + currentMinutes;
    const start = quietStart.hours * 60 + quietStart.minutes;
    const end = quietEnd.hours * 60 + quietEnd.minutes;

    if (start < end) {
      return current >= start && current < end;
    } else {
      // Handle overnight quiet hours (e.g., 22:00 - 07:00)
      return current >= start || current < end;
    }
  }
}

// Create singleton instance
const batchProcessor = new BatchProcessorService();

export default batchProcessor;
