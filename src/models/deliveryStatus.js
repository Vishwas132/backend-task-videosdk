import { Schema, model } from "mongoose";

const deliveryStatusSchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
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
      enum: [
        "sent",
        "delivered",
        "failed",
        "bounced",
        "rejected",
        "processing",
      ],
      required: true,
      index: true,
    },
    channel: {
      type: [String],
      enum: ["email", "sms", "push"],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one channel must be specified",
      },
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
          of: Schema.Types.Mixed,
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
    retryCount: {
      type: Number,
      default: 0,
      required: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
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
  } else {
    this.retryCount += 1;
  }

  return this.save();
};

export default model("DeliveryStatus", deliveryStatusSchema);
