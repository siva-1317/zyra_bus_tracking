const mongoose = require("mongoose");

const normalizeStopName = (name = "") =>
  String(name).toLowerCase().replace(/\s+/g, "");

const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

stopSchema.pre("validate", function preValidate() {
  this.stopName = String(this.stopName || "").trim().replace(/\s+/g, " ");
  this.normalizedName = normalizeStopName(this.stopName);
});

module.exports = mongoose.model("Stop", stopSchema);
