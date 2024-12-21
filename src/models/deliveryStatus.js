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
    processingTime: {
      type: Number,
      default: 0,
    },
    deliveryTime: {
      type: Number,
      default: 0,
    },
    responseTime: {
      type: Number,
      default: 0,
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

// Static method to add a delivery attempt using atomic operations
deliveryStatusSchema.statics.addDeliveryAttempt = async function (
  deliveryStatusId,
  {
    status,
    errorCode,
    errorMessage,
    metadata = {},
    processingTime = 0,
    deliveryTime = 0,
  }
) {
  const now = new Date();
  const updateData = {
    $push: {
      deliveryAttempts: {
        timestamp: now,
        status,
        errorCode,
        errorMessage,
        metadata,
      },
    },
    $set: {
      lastAttemptAt: now,
    },
  };

  if (status === "success") {
    updateData.$set = {
      ...updateData.$set,
      status: "delivered",
      deliveredAt: now,
      processingTime,
      deliveryTime,
      responseTime: processingTime + deliveryTime,
    };
  } else {
    updateData.$inc = { retryCount: 1 };
  }

  try {
    const updatedStatus = await this.findByIdAndUpdate(
      deliveryStatusId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedStatus) {
      throw new Error("Delivery status not found");
    }

    return updatedStatus;
  } catch (error) {
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }
};

// Instance method wrapper for backward compatibility
deliveryStatusSchema.methods.addDeliveryAttempt = function (
  status,
  errorCode,
  errorMessage,
  metadata,
  processingTime,
  deliveryTime
) {
  return this.constructor.addDeliveryAttempt(this._id, {
    status,
    errorCode,
    errorMessage,
    metadata,
    processingTime,
    deliveryTime,
  });
};

export default model("DeliveryStatus", deliveryStatusSchema);
