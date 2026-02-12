const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");
const Driver = require("../models/Driver");


const router = express.Router();

/* ===============================
   REGISTER USER (ADMIN / STUDENT / DRIVER)
   =============================== */

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Account already exists"
      });
    }

    let role = null;

    const student = await Student.findOne({ rollNumber: username });
    if (student) role = "student";

    const driver = await Driver.findOne({ driverId: username });
    if (driver) role = "driver";

    if (!role) {
      return res.status(404).json({
        message: "User not found in student or driver records"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      role
    });

    // 🔥 IMPORTANT FIX
    if (role === "student") {
      student.userId = user._id;
      await student.save();
    }

    if (role === "driver") {
      driver.userId = user._id;
      await driver.save();
    }

    res.status(201).json({
      message: "Account created successfully",
      role
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


/* ===============================
   LOGIN USER
   =============================== */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
