const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  busNo: {
    type: String,
    required: true
  },

  direction: {
    type: String,
    enum: ["outbound", "return"],
    required: true
  },

  totalTime: {
    type: Number, // minutes
    required: true
  },

  segmentTimes: {
    type: [Number] // auto-calculated from distance
  },

  startTime: Date,

  pauseStart: Date,

  pausedDuration: {
    type: Number,
    default: 0 // milliseconds
  },

  currentSegmentIndex: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["planned", "running", "paused", "completed"],
    default: "planned"
  }

}, { timestamps: true });

module.exports = mongoose.model("Trip", tripSchema);
