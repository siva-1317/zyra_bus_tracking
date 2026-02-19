const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const Student = require("../models/Student");
const Bus = require("../models/Bus");
const Trip = require("../models/Trip");
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const Driver = require("../models/Driver");

// TEST ROUTE (IMPORTANT)
router.get("/test", (req, res) => {
  res.send("student route working");
});

// ===============================
// STUDENT GET OWN PROFILE
// ===============================
router.get("/profile", auth, allowRoles(["student"]), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    let driver = null;
    let bus = null;
    let stopDetails = null;

    if (student.assignedBus) {
      driver = await Driver.findOne({ assignedBus: student.assignedBus });
      bus = await Bus.findOne({ busNo: student.assignedBus });

      if (bus) {
        // 🔥 Find matching stop
        const matchedStop = bus.stops.find(
          (stop) =>
            stop.stopName.trim().toLowerCase() ===
            student.busStop.trim().toLowerCase(),
        );

        if (matchedStop) {
          stopDetails = {
            stopName: matchedStop.stopName,
            morningTime: matchedStop.morningTime,
            eveningTime: matchedStop.eveningTime,
          };
        }
      }
    }

    res.json({
      student,
      driver,
      bus,
      stopDetails, // 🔥 Now contains both times
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===============================
// STUDENT GET AVAILABLE ROUTES
// ===============================
router.get("/routes", auth, allowRoles(["student"]), async (req, res) => {
  try {
    const buses = await Bus.find(
      { availableSeats: { $gt: 0 } }, // only buses with seats
      "busNo routeName stops availableSeats"
    );

    res.json(buses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




router.post("/select-stop", auth, allowRoles(["student"]), async (req, res) => {
  try {
    const { busNo, busStop } = req.body;

    if (!busNo || !busStop) {
      return res.status(400).json({
        message: "Route and Stop are required",
      });
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    if (student.busStop) {
      return res.status(400).json({
        message: "Bus stop already selected. Contact admin.",
      });
    }

    const bus = await Bus.findOne({ busNo });
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    // Check if stop exists in that route
    const stopExists = bus.stops.find(
      (stop) =>
        stop.stopName.trim().toLowerCase() ===
        busStop.trim().toLowerCase()
    );

    if (!stopExists) {
      return res.status(404).json({
        message: "Invalid stop for selected route",
      });
    }

    if (bus.availableSeats <= 0) {
      return res.status(400).json({
        message: "Bus is full",
      });
    }

    // Assign
    student.busStop = stopExists.stopName;
    student.assignedBus = bus.busNo;

    bus.availableSeats -= 1;

    await student.save();
    await bus.save();

    res.json({
      message: "Bus assigned successfully",
      busNo: bus.busNo,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/bus", auth, allowRoles(["student"]), async (req, res) => {
  const student = await Student.findOne({ userId: req.user.id });

  if (!student || !student.assignedBus) {
    return res.json(null);
  }

  const bus = await Bus.findOne({ busNo: student.assignedBus });

  res.json(bus);
});

router.get("/trip/:busNo", auth, allowRoles(["student"]), async (req, res) => {
  const trip = await Trip.findOne({
    busNo: req.params.busNo,
    status: "running",
  });

  if (!trip) {
    return res.json({ message: "No active trip" });
  }

  const elapsed = Date.now() - trip.startTime.getTime() - trip.pausedDuration;

  let cumulative = 0;
  let currentIndex = 0;

  for (let i = 0; i < trip.segmentTimes.length; i++) {
    cumulative += trip.segmentTimes[i] * 60000;
    if (elapsed < cumulative) {
      currentIndex = i;
      break;
    }
  }

  res.json({
    direction: trip.direction,
    currentStopIndex: currentIndex,
    progressPercent: Math.min((elapsed / (trip.totalTime * 60000)) * 100, 100),
  });
});

router.get(
  "/trip/:busNo/eta",
  auth,
  allowRoles(["student"]),
  async (req, res) => {
    try {
      const trip = await Trip.findOne({
        busNo: req.params.busNo,
        status: { $in: ["running", "paused"] },
      });

      if (!trip) {
        return res.json({ message: "No active trip" });
      }

      const bus = await Bus.findOne({ busNo: req.params.busNo });
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }

      const now = Date.now();

      const effectiveElapsed =
        now - trip.startTime.getTime() - trip.pausedDuration;

      let cumulativeMs = 0;
      let currentIndex = 0;

      const etaList = [];

      for (let i = 0; i < trip.segmentTimes.length + 1; i++) {
        if (i > 0) {
          cumulativeMs += trip.segmentTimes[i - 1] * 60000;
        }

        let status = "upcoming";
        if (effectiveElapsed >= cumulativeMs) {
          status = "completed";
          currentIndex = i;
        } else if (effectiveElapsed < cumulativeMs && currentIndex === i) {
          status = "current";
        }

        const etaTime = new Date(
          trip.startTime.getTime() + cumulativeMs + trip.pausedDuration,
        );

        etaList.push({
          stop: bus.stops[i],
          eta: etaTime,
          status,
        });
      }

      const progressPercent = Math.min(
        (effectiveElapsed / (trip.totalTime * 60000)) * 100,
        100,
      );

      res.json({
        direction: trip.direction,
        progressPercent,
        currentStopIndex: currentIndex,
        eta: etaList,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

router.put(
  "/change-password",
  auth,
  allowRoles(["student"]),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    // 1. Get logged-in user
    const user = await User.findById(req.user.id);

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // 3. Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // 4. Update password
    user.password = hashed;
    user.mustChangePassword = false; // clear forced change
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  },
);

router.post("/feedback", auth, allowRoles(["student"]), async (req, res) => {
  try {
    const { busNo, rating, category, message } = req.body;

    if (!busNo || !message) {
      return res.status(400).json({
        message: "busNo and message are required",
      });
    }

    const feedback = await Feedback.create({
      userId: req.user.id,
      role: "student",
      busNo,
      rating: rating || 3,
      category: category || "general",
      message,
    });

    res.json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
