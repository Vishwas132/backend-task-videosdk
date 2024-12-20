import { Router } from "express";
import Notification from "../../models/notification.js";
import validateNotification from "./validator.js";
import { publishToKafka } from "./kafkaProducer.js";

const router = Router();

/**
 * @swagger
 * /api/notify:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Create a new notification
 *     description: Creates a notification and queues it for delivery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Notification created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notificationId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     scheduledFor:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/notify/{id}:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notification status
 *     description: Retrieve the current status of a notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     notificationId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     scheduledFor:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastRetryAt:
 *                       type: string
 *                       format: date-time
 *                     retryCount:
 *                       type: integer
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
