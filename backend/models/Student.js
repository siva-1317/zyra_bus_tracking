const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    // required: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  department: String,
  year: Number,

  busStop: {
    type: String,
    default: null   // set once by student
  },
  assignedBus: {
    type: String,
    default: null   // auto assigned
  },
  accountCreated:{
    type: Boolean,
    default: false
  },

  phone: String
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
