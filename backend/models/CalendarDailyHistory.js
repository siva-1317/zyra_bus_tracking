const mongoose = require("mongoose");

const calendarDailyHistorySchema = new mongoose.Schema(
  {
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    totalWorkingBuses: {
      type: Number,
      default: 0,
    },
    totalWorkingDrivers: {
      type: Number,
      default: 0,
    },
    upcomingSpecialTrips: {
      type: Number,
      default: 0,
    },
    workingBusDetails: {
      type: [
        {
          busNo: String,
          routeName: String,
        },
      ],
      default: [],
    },
    workingDriverDetails: {
      type: [
        {
          id: String,
          name: String,
          driverId: String,
          phone: String,
          assignedBus: String,
        },
      ],
      default: [],
    },
    specialTripDetails: {
      type: [
        {
          tripId: String,
          busNo: String,
          routeName: String,
          driverName: String,
          driverCode: String,
          driverPhone: String,
          status: String,
          startTime: String,
          endTime: String,
          fromDate: Date,
          toDate: Date,
          destination: String,
          reason: String,
        },
      ],
      default: [],
    },
    regularTripDetails: {
      type: [
        {
          tripId: String,
          busNo: String,
          routeName: String,
          driverName: String,
          driverCode: String,
          driverPhone: String,
          status: String,
          startTime: String,
          endTime: String,
          fromDate: Date,
          toDate: Date,
          destination: String,
          reason: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CalendarDailyHistory", calendarDailyHistorySchema);
