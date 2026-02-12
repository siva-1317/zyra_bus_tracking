const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true   // roll no / driver id
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["student", "driver", "admin"],
    required: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
