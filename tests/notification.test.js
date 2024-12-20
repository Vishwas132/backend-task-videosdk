import request from "supertest";
import app from "../src/app";
import Notification from "../src/models/notification";

describe("Notification API", () => {
  const testNotification = {
    userId: "test-user-123",
    title: "Test Notification",
    content: "This is a test notification",
    priority: "high",
    channel: "email",
    scheduledFor: new Date().toISOString(),
    metadata: {
      category: "test",
    },
  };

  describe("POST /api/notify", () => {
    it("should create a new notification", async () => {
      const response = await request(app)
        .post("/api/notify")
        .send(testNotification)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.notificationId).toBeDefined();
      expect(response.body.data.status).toBe("pending");

      // Verify notification was saved to database
      const savedNotification = await Notification.findById(
        response.body.data.notificationId
      );
      expect(savedNotification).toBeTruthy();
      expect(savedNotification.userId).toBe(testNotification.userId);
      expect(savedNotification.title).toBe(testNotification.title);
    });

    it("should validate required fields", async () => {
      const invalidNotification = {
        userId: "test-user-123",
        // Missing required fields
      };

      const response = await request(app)
        .post("/api/notify")
        .send(invalidNotification)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("GET /api/notify/:id", () => {
    it("should get notification status", async () => {
      // Create a notification first
      const notification = await Notification.create(testNotification);

      const response = await request(app)
        .get(`/api/notify/${notification._id}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.notificationId).toBe(
        notification._id.toString()
      );
      expect(response.body.data.status).toBe(notification.status);
    });

    it("should handle non-existent notification", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .get(`/api/notify/${nonExistentId}`)
        .expect(404);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Notification not found");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid notification ID format", async () => {
      const invalidId = "invalid-id";

      const response = await request(app)
        .get(`/api/notify/${invalidId}`)
        .expect(500);

      expect(response.body.status).toBe("error");
    });

    it("should handle database errors", async () => {
      // Simulate database error by passing invalid ObjectId
      const response = await request(app)
        .get("/api/notify/invalid-id")
        .expect(500);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Internal server error");
    });
  });
});
