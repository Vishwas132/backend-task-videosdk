const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
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
      enum: ["pending", "processing", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms", "push"],
      default: "email",
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
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

module.exports = mongoose.model("Notification", notificationSchema);
