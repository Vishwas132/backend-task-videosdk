import { PriorityQueue } from "../../utils/priorityQueue.js";
import Notification from "../../models/notification.js";
import config from "../../config/index.js";
import userPreferenceService from "../preferences/user.preference.service.js";
import UserPreference from "../../models/userPreference.js";
import batchProcessor from "./batch.processor.service.js";

// Initialize batch processor
batchProcessor.initialize().catch(console.error);

/**
 * Check if a notification should be batched based on priority and timing
 */
async function shouldBatchNotification(notification) {
  // Only batch low priority notifications
  if (notification.priority !== "low") {
    return false;
  }

  // Don't batch notifications that are already summaries
  if (notification.metadata?.isSummary) {
    return false;
  }

  const now = new Date();
  const scheduledTime = notification.scheduledFor
    ? new Date(notification.scheduledFor)
    : now;

  // Get notifications scheduled within the same hour
  const startOfHour = new Date(scheduledTime);
  startOfHour.setMinutes(0, 0, 0);
  const endOfHour = new Date(startOfHour);
  endOfHour.setHours(endOfHour.getHours() + 1);

  const similarNotifications = await Notification.countDocuments({
    userId: notification.userId,
    priority: "low",
    scheduledFor: {
      $gte: startOfHour,
      $lt: endOfHour,
    },
    status: { $in: ["pending", "pending_aggregation"] },
  });

  // Batch if there are multiple notifications in the same hour
  return similarNotifications > 1;
}

/**
 * Find similar notifications sent recently to prevent duplicates
 */
async function findSimilarRecentNotifications(notification) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour window

  // Find similar notifications based on content and user
  const similarNotifications = await Notification.find({
    userId: notification.userId,
    content: notification.content, // Exact match for now, could be enhanced with fuzzy matching
    status: { $in: ["sent", "delivered"] },
    createdAt: { $gte: oneHourAgo },
    _id: { $ne: notification._id }, // Exclude current notification
  }).sort({ createdAt: -1 });

  return similarNotifications;
}

// Priority levels and their weights
const PRIORITY_WEIGHTS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Initialize priority queues for different time windows
const immediateQueue = new PriorityQueue();
const scheduledQueue = new PriorityQueue();

/**
 * Select appropriate delivery channel based on priority and user preferences
 */
async function selectDeliveryChannel(userId, priority) {
  const userPrefs = await UserPreference.findOne({ userId });
  if (!userPrefs) {
    throw new Error("User preferences not found");
  }

  // Get available channels that meet priority threshold
  const availableChannels = Object.entries(userPrefs.channels || {})
    .filter(([_, config]) => config.enabled)
    .map(([channel]) => channel);

  if (availableChannels.length === 0) {
    throw new Error("No suitable delivery channel available");
  }

  // For high priority, prefer SMS if enabled
  if (
    PRIORITY_WEIGHTS[priority] >= PRIORITY_WEIGHTS.high &&
    availableChannels.includes("sms")
  ) {
    return "sms";
  }

  // For low priority, prefer email if enabled
  if (
    PRIORITY_WEIGHTS[priority] <= PRIORITY_WEIGHTS.low &&
    availableChannels.includes("email")
  ) {
    return "email";
  }

  // Otherwise use first available channel as fallback
  return availableChannels[0];
}

/**
 * Process a notification based on its priority and scheduling
 */
export async function processNotification(notification, priority) {
  try {
    // First update status based on priority and scheduling
    const weight = PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.medium;
    let scheduledTime = notification.scheduledFor
      ? new Date(notification.scheduledFor)
      : new Date();
    const now = new Date();

    let status = "processing";
    let channel;

    // Get user preferences
    const userPrefs = await UserPreference.findOne({
      userId: notification.userId,
    });
    if (!userPrefs) {
      throw new Error("User preferences not found");
    }

    // Check quiet hours for non-urgent notifications
    if (priority !== "urgent" && userPrefs.quietHours?.enabled) {
      const isQuietHours = await userPreferenceService.isInQuietHours(
        notification.userId,
        scheduledTime
      );

      if (isQuietHours) {
        // Reschedule for the next active hour
        scheduledTime = await userPreferenceService.getNextActiveHour(
          notification.userId,
          scheduledTime
        );

        // Update scheduled time in the notification
        await Notification.findByIdAndUpdate(notification._id, {
          scheduledFor: scheduledTime,
          status: "rescheduled",
          metadata: {
            ...notification.metadata,
            rescheduledDueToQuietHours: true,
          },
        });

        console.log(
          `Rescheduled notification ${notification._id} to ${scheduledTime} due to quiet hours`
        );

        // Add to scheduled queue with updated time
        scheduledQueue.enqueue(notification, weight);
        return;
      }
    }

    // Check for throttling unless it's an urgent notification
    if (priority !== "urgent") {
      // Check for similar recent notifications first
      const similarNotifications = await findSimilarRecentNotifications(
        notification
      );
      if (similarNotifications.length > 0) {
        console.log(
          `Suppressing duplicate notification ${notification._id} (similar to ${similarNotifications[0]._id})`
        );
        await Notification.findByIdAndUpdate(notification._id, {
          status: "suppressed",
          metadata: {
            ...notification.metadata,
            similarTo: similarNotifications[0]._id,
            suppressedAt: new Date(),
          },
        });
        return;
      }

      // Then check throttling
      const shouldThrottle =
        await userPreferenceService.shouldThrottleNotification(
          notification.userId
        );
      if (shouldThrottle) {
        console.log(
          `Throttling notification ${notification._id} for user ${notification.userId}`
        );
        await Notification.findByIdAndUpdate(notification._id, {
          status: "throttled",
          error: "Rate limit exceeded",
        });
        return;
      }
    }

    // For low priority notifications, check if they should be batched
    if (priority === "low" && !notification.metadata?.isSummary) {
      const shouldBatch = await shouldBatchNotification(notification);
      if (shouldBatch) {
        await Notification.findByIdAndUpdate(notification._id, {
          status: "pending_aggregation",
        });
        return;
      }
    }

    // Select delivery channel
    try {
      channel = await selectDeliveryChannel(notification.userId, priority);
    } catch (error) {
      status = "failed";
      await Notification.findByIdAndUpdate(notification._id, {
        status: "failed",
        error: error.message,
      });
      return;
    }

    // Update notification with channel and status
    await Notification.findByIdAndUpdate(notification._id, {
      status,
      channel,
      processedAt: new Date(),
      priority: priority,
    });

    // Add to appropriate queue based on scheduling and priority
    if (priority === "urgent" || priority === "high") {
      // High priority notifications always go to immediate queue
      immediateQueue.enqueue(notification, weight);
      console.log(
        `Processing high priority notification ${notification._id} immediately`
      );
      await processImmediateNotifications();
    } else if (scheduledTime <= now) {
      // Non-high priority but due now
      immediateQueue.enqueue(notification, weight);
      console.log(`Processing due notification ${notification._id}`);
      await processImmediateNotifications();
    } else {
      // Future scheduled notifications
      scheduledQueue.enqueue(notification, weight);
      console.log(
        `Scheduled notification ${notification._id} for ${scheduledTime}`
      );
    }
  } catch (error) {
    console.error("Error processing notification:", error);
    // Update notification status to failed
    await Notification.findByIdAndUpdate(notification._id, {
      status: "failed",
      $inc: { retryCount: 1 },
      lastRetryAt: new Date(),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Process notifications in the immediate queue
 */
async function processImmediateNotifications() {
  const processedNotifications = new Set();

  while (!immediateQueue.isEmpty()) {
    const notification = immediateQueue.dequeue();

    // Skip if already processed (avoid duplicates)
    if (processedNotifications.has(notification._id.toString())) {
      continue;
    }

    try {
      // First update status to processing
      const updatedNotification = await Notification.findByIdAndUpdate(
        notification._id,
        {
          status: "processing",
          processedAt: new Date(),
        },
        { new: true }
      );

      if (!updatedNotification) {
        console.error(`Notification ${notification._id} not found`);
        continue;
      }

      // Track that we've processed this notification
      processedNotifications.add(notification._id.toString());

      // Process based on priority
      if (
        updatedNotification.priority === "urgent" ||
        updatedNotification.priority === "high"
      ) {
        console.log(
          `Processing high priority notification ${notification._id}`
        );
      } else {
        console.log(
          `Processing normal priority notification ${notification._id}`
        );
      }

      console.log(`Processing notification ${notification._id}`);
    } catch (error) {
      console.error(
        `Error processing notification ${notification._id}:`,
        error
      );

      // Handle retry logic
      if (notification.retryCount < config.kafka.maxRetries) {
        const updatedNotification = await Notification.findByIdAndUpdate(
          notification._id,
          {
            status: "retry",
            $inc: { retryCount: 1 },
            lastRetryAt: new Date(),
            error: error.message,
          },
          { new: true }
        );

        // Re-queue with reduced priority after a delay
        setTimeout(() => {
          const newWeight = Math.max(
            PRIORITY_WEIGHTS.low,
            PRIORITY_WEIGHTS[notification.priority] - 1
          );
          immediateQueue.enqueue(updatedNotification, newWeight);
        }, config.kafka.retryDelay || 5000);
      } else {
        await Notification.findByIdAndUpdate(notification._id, {
          status: "failed",
          error: error.message,
          failedAt: new Date(),
        });
      }
    }
  }
}

/**
 * Process notifications in the scheduled queue
 * This should be called periodically by a scheduler
 */
export async function processScheduledNotifications() {
  const now = new Date();

  while (!scheduledQueue.isEmpty()) {
    const notification = scheduledQueue.peek();
    const scheduledTime = new Date(notification.scheduledFor);

    if (scheduledTime <= now) {
      scheduledQueue.dequeue();
      await Notification.findByIdAndUpdate(notification._id, {
        status: "processing",
        processedAt: new Date(),
      });
      immediateQueue.enqueue(
        notification,
        PRIORITY_WEIGHTS[notification.priority] || PRIORITY_WEIGHTS.medium
      );
    } else {
      // If the next notification is not due yet, stop processing
      break;
    }
  }

  // Process any notifications that were moved to the immediate queue
  if (!immediateQueue.isEmpty()) {
    await processImmediateNotifications();
  }
}

// Start the scheduled notification processor
setInterval(
  processScheduledNotifications,
  config.kafka.schedulingInterval || 5000
);
