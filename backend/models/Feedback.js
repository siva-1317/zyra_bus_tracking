const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  role: {
    type: String,
    enum: ["student", "driver"],
    required: true
  },

  busNo: {
    type: String,
    required: true
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  category: {
    type: String,
    enum: ["driver", "bus", "route", "timing", "general"],
    default: "general"
  },

  message: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["new", "reviewed"],
    default: "new"
  }

}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
