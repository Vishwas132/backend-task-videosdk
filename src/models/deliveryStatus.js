const mongoose = require("mongoose");

const deliveryStatusSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed", "bounced", "rejected"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms", "push"],
      required: true,
    },
    deliveryAttempts: [
      {
        timestamp: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ["success", "failure"],
          required: true,
        },
        errorCode: {
          type: String,
        },
        errorMessage: {
          type: String,
        },
        metadata: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    lastAttemptAt: {
      type: Date,
      required: true,
    },
    deliveredAt: {
      type: Date,
    },
    failureReason: {
      code: String,
      message: String,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // For email-specific tracking
    emailMetadata: {
      messageId: String,
      openedAt: Date,
      clickedAt: Date,
      bounceReason: String,
    },
    // For SMS-specific tracking
    smsMetadata: {
      messageId: String,
      carrier: String,
      deliveryReport: String,
    },
    // For push notification-specific tracking
    pushMetadata: {
      deviceType: String,
      deviceToken: String,
      platform: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
deliveryStatusSchema.index({ notificationId: 1, status: 1 });
deliveryStatusSchema.index({ userId: 1, status: 1, createdAt: -1 });
deliveryStatusSchema.index({ channel: 1, status: 1, createdAt: -1 });

// Virtual for total attempts count
deliveryStatusSchema.virtual("totalAttempts").get(function () {
  return this.deliveryAttempts.length;
});

// Method to add a new delivery attempt
deliveryStatusSchema.methods.addDeliveryAttempt = function (
  status,
  errorCode,
  errorMessage,
  metadata
) {
  this.deliveryAttempts.push({
    timestamp: new Date(),
    status,
    errorCode,
    errorMessage,
    metadata,
  });
  this.lastAttemptAt = new Date();

  if (status === "success") {
    this.status = "delivered";
    this.deliveredAt = new Date();
  }

  return this.save();
};

module.exports = mongoose.model("DeliveryStatus", deliveryStatusSchema);
