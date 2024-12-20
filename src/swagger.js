import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Notification System API",
      version: "1.0.0",
      description: "API documentation for the distributed notification system",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Notification: {
          type: "object",
          required: ["userId", "title", "content"],
          properties: {
            userId: {
              type: "string",
              description: "ID of the user to notify",
            },
            title: {
              type: "string",
              description: "Notification title",
            },
            content: {
              type: "string",
              description: "Notification content",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              default: "medium",
              description: "Notification priority level",
            },
            channel: {
              type: "string",
              enum: ["email", "sms", "push"],
              default: "email",
              description: "Delivery channel",
            },
            scheduledFor: {
              type: "string",
              format: "date-time",
              description: "When to deliver the notification",
            },
            metadata: {
              type: "object",
              description: "Additional notification metadata",
            },
          },
        },
        UserPreference: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID",
            },
            email: {
              type: "string",
              description: "User email address",
            },
            channels: {
              type: "object",
              properties: {
                email: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    address: { type: "string" },
                  },
                },
                sms: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    phoneNumber: { type: "string" },
                  },
                },
                push: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    deviceTokens: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
            quietHours: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                start: {
                  type: "string",
                  pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
                },
                end: {
                  type: "string",
                  pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
                },
              },
            },
            throttling: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                maxNotifications: { type: "integer", minimum: 1 },
                timeWindow: { type: "integer", minimum: 60000 },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "error",
            },
            message: {
              type: "string",
            },
            error: {
              type: "string",
            },
          },
        },
      },
    },
  },
  apis: ["./src/services/*/*.js"], // Path to the API routes
};

export const specs = swaggerJsdoc(options);
