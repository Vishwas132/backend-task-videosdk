/**
 * Validates notification request payload
 * @param {Object} data Request body
 * @returns {Object|null} Validation errors or null if valid
 */
export default function validateNotification(data) {
  const errors = {};

  // Required fields
  if (!data.userId) {
    errors.userId = "User ID is required";
  }

  if (!data.title) {
    errors.title = "Title is required";
  } else if (typeof data.title !== "string" || data.title.length > 255) {
    errors.title =
      "Title must be a string with maximum length of 255 characters";
  }

  if (!data.content) {
    errors.content = "Content is required";
  } else if (typeof data.content !== "string") {
    errors.content = "Content must be a string";
  }

  // Optional fields validation
  if (
    data.priority &&
    !["low", "medium", "high", "urgent"].includes(data.priority)
  ) {
    errors.priority = "Priority must be one of: low, medium, high, urgent";
  }

  if (data.channel) {
    const validChannels = ["email", "sms", "push"];
    if (!validChannels.includes(data.channel)) {
      errors.channel = "Channel must be one of: email, sms, push";
    }
  }

  if (data.scheduledFor) {
    const scheduledDate = new Date(data.scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      errors.scheduledFor = "Invalid date format for scheduledFor";
    } else if (scheduledDate < new Date()) {
      errors.scheduledFor = "Scheduled time must be in the future";
    }
  }

  if (data.metadata && typeof data.metadata !== "object") {
    errors.metadata = "Metadata must be an object";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
