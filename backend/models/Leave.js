const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true
  },
  busNo: String,

  fromDate: Date,
  toDate: Date,
  reason: String,

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  adminRemark: String
}, { timestamps: true });

module.exports = mongoose.model("Leave", leaveSchema);
