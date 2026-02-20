const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    busNo: {
      type: String,
      required: true,
    },
    destination: String,
    reason: String,
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    fromDate: Date,
    toDate: Date,
    startTime: String,
    endTime: String,
    tripType: {
      type: String,
      enum: ["route", "event"],
      required: true,
    },

    status: {
      type: String,
      enum: ["idle", "running", "paused", "completed", "planned"],
      default: "idle",
    },

    // startTime: Date,
    // endTime: Date,

    segmentTimes: [Number],
    totalTime: Number,

    pausedDuration: {
      type: Number,
      default: 0,
    },

    pauseStart: Date,

    currentLocation: {
      lat: Number,
      lng: Number,
    },

    lastLocationUpdate: Date,
  },

  { timestamps: true },
);

module.exports = mongoose.model("Trip", tripSchema);
