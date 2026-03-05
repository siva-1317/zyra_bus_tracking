const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  driverId: {
    type: String,
    unique: true,
    required: true
  },
  name: String,
  phone: String,
  licenseNo: String,

  assignedBus: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Driver", driverSchema);
