const mongoose = require("mongoose");

const calendarNoteSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CalendarNote", calendarNoteSchema);
