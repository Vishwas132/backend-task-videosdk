import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "delivered", "failed", "throttled"],
      default: "pending",
      index: true,
    },
    channel: {
      type: [String],
      validate: {
        validator: function (channels) {
          const validChannels = ["email", "sms", "push"];
          return channels.every((ch) => validChannels.includes(ch));
        },
        message: "Each channel must be one of: email, sms, push",
      },
      default: ["email"],
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

export default model("Notification", notificationSchema);
