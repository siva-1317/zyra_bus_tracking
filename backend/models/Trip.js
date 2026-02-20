const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  busNo: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["idle", "running", "paused", "completed"],
    default: "idle"
  },

  startTime: Date,
  endTime: Date,

  segmentTimes: [Number],
  totalTime: Number,

  pausedDuration: {
    type: Number,
    default: 0
  },

  pauseStart: Date,

  currentLocation: {
    lat: Number,
    lng: Number
  },

  lastLocationUpdate: Date
},
{ timestamps: true } 
);

module.exports = mongoose.model("Trip", tripSchema);