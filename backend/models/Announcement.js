const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    audience: {
      type: String,
      enum: ["all", "students", "drivers"],
      default: "all"
    },

    // 👇 NEW FIELD
    busNo: {
      type: String,
      default: null
      // Example: "TN45"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
