const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
driver: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Driver",
  required: true
},
  busNo: String,

  fromDate: Date,
  toDate: Date,
  reason: String,
  fromTime: String,
  toTime: String,

  status: {
    type: String,
    enum: ["waiting", "approved", "rejected"],
    default: "waiting"
  },

  adminRemark: String
}, { timestamps: true });

module.exports = mongoose.model("Leave", leaveSchema);
