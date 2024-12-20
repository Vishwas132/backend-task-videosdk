import UserPreference from "../../models/userPreference";

class UserPreferenceService {
  /**
   * Create or update user preferences
   */
  async upsertPreferences(userId, preferences) {
    try {
      // Validate quiet hours format if provided
      if (preferences.quietHours) {
        this.#validateQuietHours(preferences.quietHours);
      }

      // Validate throttling settings if provided
      if (preferences.throttling) {
        this.#validateThrottling(preferences.throttling);
      }

      const updatedPreferences = await UserPreference.findOneAndUpdate(
        { userId },
        {
          $set: {
            ...preferences,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      return updatedPreferences;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        // Return default preferences if none exist
        return this.#createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      throw error;
    }
  }

  /**
   * Check if notification should be throttled based on user preferences
   */
  async shouldThrottleNotification(userId) {
    try {
      const preferences = await this.getPreferences(userId);

      if (!preferences.throttling.enabled) {
        return false;
      }

      const now = new Date();
      const timeWindow = preferences.throttling.timeWindow;
      const maxNotifications = preferences.throttling.maxNotifications;

      // Count notifications in the time window
      const recentNotificationsCount = await this.#countRecentNotifications(
        userId,
        now - timeWindow
      );

      return recentNotificationsCount >= maxNotifications;
    } catch (error) {
      console.error("Error checking throttling:", error);
      return false; // Default to not throttling on error
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  async isQuietHours(userId) {
    try {
      const preferences = await this.getPreferences(userId);

      if (!preferences.quietHours.enabled) {
        return false;
      }

      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();

      const start = this.#timeStringToMinutes(preferences.quietHours.start);
      const end = this.#timeStringToMinutes(preferences.quietHours.end);

      // Handle case where quiet hours span midnight
      if (start > end) {
        return currentTime >= start || currentTime <= end;
      }

      return currentTime >= start && currentTime <= end;
    } catch (error) {
      console.error("Error checking quiet hours:", error);
      return false; // Default to not quiet hours on error
    }
  }

  /**
   * Create default preferences for a new user
   * @private
   */
  #createDefaultPreferences = async (userId) => {
    return await UserPreference.create({
      userId,
      email: "", // This should be set when creating a user
      channels: {
        email: { enabled: true },
        sms: { enabled: false },
        push: { enabled: false },
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
      },
      throttling: {
        enabled: false,
        maxNotifications: 10,
        timeWindow: 3600000, // 1 hour
      },
      active: true,
    });
  };

  /**
   * Validate quiet hours format
   * @private
   */
  #validateQuietHours = (quietHours) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (quietHours.start && !timeRegex.test(quietHours.start)) {
      throw new Error(
        "Invalid quiet hours start time format. Use HH:mm format"
      );
    }

    if (quietHours.end && !timeRegex.test(quietHours.end)) {
      throw new Error("Invalid quiet hours end time format. Use HH:mm format");
    }
  };

  /**
   * Validate throttling settings
   * @private
   */
  #validateThrottling = (throttling) => {
    if (throttling.maxNotifications && throttling.maxNotifications < 1) {
      throw new Error("Maximum notifications must be at least 1");
    }

    if (throttling.timeWindow && throttling.timeWindow < 60000) {
      // 1 minute
      throw new Error("Time window must be at least 1 minute");
    }
  };

  /**
   * Convert time string to minutes since midnight
   * @private
   */
  #timeStringToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 100 + minutes;
  };

  /**
   * Count recent notifications for throttling
   * @private
   */
  #countRecentNotifications = async (userId, since) => {
    // This would typically query your notifications collection
    // For now, we'll return 0 as it requires integration with the notification service
    return 0;
  };
}

// Export singleton instance
export default new UserPreferenceService();
