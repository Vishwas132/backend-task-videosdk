import { PriorityQueue } from "../../utils/priorityQueue.js";
import Notification from "../../models/notification.js";
import config from "../../config/index.js";

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
 * Process a notification based on its priority and scheduling
 */
export async function processNotification(notification, priority) {
  try {
    const weight = PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.medium;
    const scheduledTime = notification.scheduledFor
      ? new Date(notification.scheduledFor)
      : new Date();
    const now = new Date();

    // Update notification status and add to appropriate queue based on scheduling and priority
    if (priority === "urgent" || priority === "high") {
      // High priority notifications always go to immediate queue
      await Notification.findByIdAndUpdate(notification._id, {
        status: "processing",
        processedAt: new Date(),
        priority: priority,
      });
      immediateQueue.enqueue(notification, weight);
      console.log(
        `Processing high priority notification ${notification._id} immediately`
      );
      await processImmediateNotifications();
    } else if (scheduledTime <= now) {
      // Non-high priority but due now
      await Notification.findByIdAndUpdate(notification._id, {
        status: "processing",
        processedAt: new Date(),
        priority: priority,
      });
      immediateQueue.enqueue(notification, weight);
      console.log(`Processing due notification ${notification._id}`);
      await processImmediateNotifications();
    } else {
      // Future scheduled notifications
      await Notification.findByIdAndUpdate(notification._id, {
        status: "processing",
        scheduledFor: scheduledTime,
        priority: priority,
      });
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
        await Notification.findByIdAndUpdate(notification._id, {
          status: "processing",
          processedAt: new Date(),
        });
        console.log(
          `Processing high priority notification ${notification._id}`
        );
      } else {
        await Notification.findByIdAndUpdate(notification._id, {
          status: "processing",
          processedAt: new Date(),
        });
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
