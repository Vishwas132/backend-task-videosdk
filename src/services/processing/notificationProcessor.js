import { PriorityQueue } from "../../utils/priorityQueue";
import Notification from "../../models/notification";
import { kafka } from "../../config";

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
    // Update notification status to processing
    await Notification.findByIdAndUpdate(notification.notificationId, {
      status: "processing",
    });

    const weight = PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.medium;
    const scheduledTime = new Date(notification.scheduledFor);
    const now = new Date();

    // Add to appropriate queue based on scheduling
    if (scheduledTime <= now) {
      immediateQueue.enqueue(notification, weight);
      await processImmediateNotifications();
    } else {
      scheduledQueue.enqueue(notification, weight);
      console.log(
        `Scheduled notification ${notification.notificationId} for ${scheduledTime}`
      );
    }
  } catch (error) {
    console.error("Error processing notification:", error);
    // Update notification status to failed
    await Notification.findByIdAndUpdate(notification.notificationId, {
      status: "failed",
      $inc: { retryCount: 1 },
      lastRetryAt: new Date(),
    });
    throw error;
  }
}

/**
 * Process notifications in the immediate queue
 */
async function processImmediateNotifications() {
  while (!immediateQueue.isEmpty()) {
    const notification = immediateQueue.dequeue();

    try {
      // Here we would integrate with the delivery service
      // For now, we'll just update the status
      await Notification.findByIdAndUpdate(notification.notificationId, {
        status: "delivered",
      });

      console.log(
        `Processed immediate notification ${notification.notificationId}`
      );
    } catch (error) {
      console.error(
        `Error processing immediate notification ${notification.notificationId}:`,
        error
      );

      // Handle retry logic
      if (notification.retryCount < kafka.maxRetries) {
        await Notification.findByIdAndUpdate(notification.notificationId, {
          status: "pending",
          $inc: { retryCount: 1 },
          lastRetryAt: new Date(),
        });

        // Re-queue with reduced priority
        const newWeight = Math.max(
          PRIORITY_WEIGHTS.low,
          PRIORITY_WEIGHTS[notification.priority] - 1
        );
        immediateQueue.enqueue(notification, newWeight);
      } else {
        await Notification.findByIdAndUpdate(notification.notificationId, {
          status: "failed",
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
setInterval(processScheduledNotifications, kafka.schedulingInterval || 5000);
