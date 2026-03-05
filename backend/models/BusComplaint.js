const mongoose = require("mongoose");

const busComplaintSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    busNo: {
      type: String,
      required: true,
    },
    complaintType: {
      type: String,
      enum: ["puncture", "breakdown", "brake", "engine", "other"],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "in-review", "resolved", "rejected"],
      default: "pending",
    },
    adminAction: {
      type: String,
      enum: ["none", "need-repair", "no-issue", "resolved"],
      default: "none",
    },
    adminRemark: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BusComplaint", busComplaintSchema);
