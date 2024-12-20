import express from "express";
import userPreferenceService from "./userPreferenceService.js";

const router = express.Router();

/**
 * @route GET /api/preferences/:userId
 * @description Get user preferences
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
 * @route PUT /api/preferences/:userId
 * @description Update user preferences
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
 * @route GET /api/preferences/:userId/quiet-hours
 * @description Check if current time is within quiet hours
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
 * @route GET /api/preferences/:userId/throttle-status
 * @description Check if notifications should be throttled
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
