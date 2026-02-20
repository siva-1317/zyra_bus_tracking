const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({
  stopName: {
    type: String,
    required: true
  },
  morningTime: {
    type: String,   // Format: "HH:mm" (e.g., "08:15")
    required: true
  },
  eveningTime: {
    type: String,   // Format: "HH:mm"
    required: true
  },
  lat: Number,
  lng: Number
}, { _id: false });

const busSchema = new mongoose.Schema({
  busNo: {
    type: String,
    unique: true,
    required: true
  },

  routeName: {
    type: String,
    required: true
  },

  driverId: {
    type: String,
    default: null
  },

  // Timetable stops
  stops: {
    type: [stopSchema],
    required: true
  },

  totalSeats: {
  type: Number,
  required: true,
  min: 1
},

availableSeats: {
  type: Number,
  default: function () {
    return this.totalSeats;
  }
},
  tripStartMorning: String,
  tripEndMorning: String,

  tripStartEvening: String,
  tripEndEvening: String,


  // -------- Trip Runtime State -------- //

  tripStatus: {
    type: String,
    enum: ["not-started", "running", "paused", "ended"],
    default: "not-started"
  },

  tripType: {
    type: String,
    enum: ["morning", "evening"],
    default: null
  },

  actualStartTime: {
    type: Date,
    default: null
  },

  delayOffset: {
    type: Number, // in minutes
    default: 0
  },

  pauseStartTime: {
    type: Date,
    default: null
  },

  totalPausedDuration: {
    type: Number, // in minutes
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Bus", busSchema);
