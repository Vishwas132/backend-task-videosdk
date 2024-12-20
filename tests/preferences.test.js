import request from "supertest";
import app from "../src/app";
import UserPreference from "../src/models/userPreference";

describe("User Preferences API", () => {
  const testUserId = "test-user-123";
  const testPreferences = {
    email: "test@example.com",
    channels: {
      email: {
        enabled: true,
        address: "test@example.com",
      },
      sms: {
        enabled: false,
        phoneNumber: null,
      },
    },
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "07:00",
    },
    throttling: {
      enabled: true,
      maxNotifications: 10,
      timeWindow: 3600000,
    },
  };

  describe("GET /api/preferences/:userId", () => {
    it("should get user preferences", async () => {
      // Create test preferences first
      await UserPreference.create({
        userId: testUserId,
        ...testPreferences,
      });

      const response = await request(app)
        .get(`/api/preferences/${testUserId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.data.email).toBe(testPreferences.email);
      expect(response.body.data.quietHours.enabled).toBe(true);
    });

    it("should return default preferences for new user", async () => {
      const newUserId = "new-user-123";

      const response = await request(app)
        .get(`/api/preferences/${newUserId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.userId).toBe(newUserId);
      expect(response.body.data.channels.email.enabled).toBe(true);
      expect(response.body.data.quietHours.enabled).toBe(false);
    });
  });

  describe("PUT /api/preferences/:userId", () => {
    it("should update user preferences", async () => {
      const response = await request(app)
        .put(`/api/preferences/${testUserId}`)
        .send(testPreferences)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.data.email).toBe(testPreferences.email);
      expect(response.body.data.quietHours.start).toBe(
        testPreferences.quietHours.start
      );
    });

    it("should validate quiet hours format", async () => {
      const invalidPreferences = {
        ...testPreferences,
        quietHours: {
          enabled: true,
          start: "invalid-time",
          end: "07:00",
        },
      };

      const response = await request(app)
        .put(`/api/preferences/${testUserId}`)
        .send(invalidPreferences)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Invalid preferences data");
    });

    it("should validate throttling settings", async () => {
      const invalidPreferences = {
        ...testPreferences,
        throttling: {
          enabled: true,
          maxNotifications: 0, // Invalid: must be at least 1
          timeWindow: 3600000,
        },
      };

      const response = await request(app)
        .put(`/api/preferences/${testUserId}`)
        .send(invalidPreferences)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Invalid preferences data");
    });
  });

  describe("GET /api/preferences/:userId/quiet-hours", () => {
    it("should check if current time is within quiet hours", async () => {
      await UserPreference.create({
        userId: testUserId,
        ...testPreferences,
      });

      const response = await request(app)
        .get(`/api/preferences/${testUserId}/quiet-hours`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.isQuietHours).toBeDefined();
    });
  });

  describe("GET /api/preferences/:userId/throttle-status", () => {
    it("should check if notifications should be throttled", async () => {
      await UserPreference.create({
        userId: testUserId,
        ...testPreferences,
      });

      const response = await request(app)
        .get(`/api/preferences/${testUserId}/throttle-status`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.shouldThrottle).toBeDefined();
    });
  });
});
