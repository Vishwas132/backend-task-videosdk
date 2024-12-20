import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";

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
router.post("/notify", NotificationController.create);

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
router.get("/notify/:id", NotificationController.getStatus);

export default router;
