import { Router } from "express";
import Notification from "../../models/notification";
import validateNotification from "./validator";
import { publishToKafka } from "./kafkaProducer";

const router = Router();

/**
 * @route POST /notify
 * @description Create a new notification
 */
router.post("/notify", async (req, res) => {
  try {
    // Validate request body
    const validationError = validateNotification(req.body);
    if (validationError) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: validationError,
      });
    }

    // Create notification record
    const notification = new Notification({
      userId: req.body.userId,
      title: req.body.title,
      content: req.body.content,
      priority: req.body.priority || "medium",
      channel: req.body.channel || "email",
      scheduledFor: req.body.scheduledFor || new Date(),
      metadata: req.body.metadata || {},
    });

    // Save to database
    await notification.save();

    // Publish to Kafka for processing
    await publishToKafka("notifications", {
      notificationId: notification._id,
      userId: notification.userId,
      priority: notification.priority,
      scheduledFor: notification.scheduledFor,
    });

    res.status(201).json({
      status: "success",
      message: "Notification created successfully",
      data: {
        notificationId: notification._id,
        status: notification.status,
        scheduledFor: notification.scheduledFor,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route GET /notify/:id
 * @description Get notification status
 */
router.get("/notify/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.json({
      status: "success",
      data: {
        notificationId: notification._id,
        status: notification.status,
        scheduledFor: notification.scheduledFor,
        createdAt: notification.createdAt,
        lastRetryAt: notification.lastRetryAt,
        retryCount: notification.retryCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
