import { Router } from "express";
import { PreferenceController } from "../controllers/preference.controller.js";

const router = Router();

/**
 * @swagger
 * /api/preferences/{userId}:
 *   get:
 *     tags:
 *       - Preferences
 *     summary: Get user preferences
 *     description: Retrieve notification preferences for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/preferences/:userId", PreferenceController.getUserPreferences);

/**
 * @swagger
 * /api/preferences/{userId}:
 *   put:
 *     tags:
 *       - Preferences
 *     summary: Update user preferences
 *     description: Update or create notification preferences for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserPreference'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
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
 *                   example: Preferences updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserPreference'
 *       400:
 *         description: Invalid preferences data
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
router.put("/preferences/:userId", PreferenceController.updateUserPreferences);

/**
 * @swagger
 * /api/preferences/{userId}/quiet-hours:
 *   get:
 *     tags:
 *       - Preferences
 *     summary: Check quiet hours status
 *     description: Check if current time is within the user's quiet hours
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Quiet hours status retrieved successfully
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
 *                     isQuietHours:
 *                       type: boolean
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/preferences/:userId/quiet-hours",
  PreferenceController.checkQuietHours
);

/**
 * @swagger
 * /api/preferences/{userId}/throttle-status:
 *   get:
 *     tags:
 *       - Preferences
 *     summary: Check throttle status
 *     description: Check if notifications should be throttled for the user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Throttle status retrieved successfully
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
 *                     shouldThrottle:
 *                       type: boolean
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/preferences/:userId/throttle-status",
  PreferenceController.checkThrottleStatus
);

export default router;
