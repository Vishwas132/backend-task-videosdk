import userPreferenceService from "../services/preferences/user.preference.service.js";

export class PreferenceController {
  static async getUserPreferences(req, res) {
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async updateUserPreferences(req, res) {
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
      if (
        error.message.includes("format") ||
        error.message.includes("must be")
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid preferences data",
          error: error.message,
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to update preferences",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async checkQuietHours(req, res) {
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async checkThrottleStatus(req, res) {
    try {
      const shouldThrottle =
        await userPreferenceService.shouldThrottleNotification(
          req.params.userId
        );
      res.json({
        status: "success",
        data: { shouldThrottle },
      });
    } catch (error) {
      console.error("Error checking throttle status:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to check throttle status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}
