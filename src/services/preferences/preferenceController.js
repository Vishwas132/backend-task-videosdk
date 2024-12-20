import express from "express";
import userPreferenceService from "./userPreferenceService.js";

const router = express.Router();

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
router.get("/preferences/:userId", async (req, res) => {
  try {
    const preferences = await userPreferenceService.getPreferences(
      req.params.userId
    );
    res.json({
      status: "success",
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch preferences",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

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
router.put("/preferences/:userId", async (req, res) => {
  try {
    const preferences = await userPreferenceService.upsertPreferences(
      req.params.userId,
      req.body
    );

    res.json({
      status: "success",
      message: "Preferences updated successfully",
      data: preferences,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);

    // Handle validation errors
    if (error.message.includes("format") || error.message.includes("must be")) {
      return res.status(400).json({
        status: "error",
        message: "Invalid preferences data",
        error: error.message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update preferences",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

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
router.get("/preferences/:userId/quiet-hours", async (req, res) => {
  try {
    const isQuietHours = await userPreferenceService.isQuietHours(
      req.params.userId
    );
    res.json({
      status: "success",
      data: { isQuietHours },
    });
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check quiet hours",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

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
router.get("/preferences/:userId/throttle-status", async (req, res) => {
  try {
    const shouldThrottle =
      await userPreferenceService.shouldThrottleNotification(req.params.userId);
    res.json({
      status: "success",
      data: { shouldThrottle },
    });
  } catch (error) {
    console.error("Error checking throttle status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check throttle status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
