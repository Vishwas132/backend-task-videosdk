const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        address: { type: String },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        phoneNumber: { type: String },
      },
      push: {
        enabled: { type: Boolean, default: false },
        deviceTokens: [{ type: String }],
      },
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: {
        type: String,
        default: "22:00",
        validate: {
          validator: function (v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "Start time must be in HH:mm format",
        },
      },
      end: {
        type: String,
        default: "07:00",
        validate: {
          validator: function (v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "End time must be in HH:mm format",
        },
      },
    },
    throttling: {
      enabled: {
        type: Boolean,
        default: false,
      },
      maxNotifications: {
        type: Number,
        default: 10,
        min: 1,
      },
      timeWindow: {
        type: Number,
        default: 3600000, // 1 hour in milliseconds
      },
    },
    priorityThresholds: {
      type: Map,
      of: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
      },
      default: {
        email: "low",
        sms: "high",
        push: "medium",
      },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active users
userPreferenceSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model("UserPreference", userPreferenceSchema);
