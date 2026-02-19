const express = require("express");
const router = express.Router();

const Driver = require("../models/Driver");
const Bus = require("../models/Bus");
const Trip = require("../models/Trip");
const Announcement = require("../models/Announcement");
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

/* =====================================================
   GET DRIVER PROFILE (Dashboard)
   ===================================================== */
router.get(
  "/profile",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      // req.user.id comes from JWT
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      // get assigned bus details
      const bus = driver.assignedBus
        ? await Bus.findOne({ busNo: driver.assignedBus })
        : null;

      res.json({
        driver,
        bus
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);




// leave


const Leave = require("../models/Leave");

/* =====================================================
   DRIVER APPLY LEAVE
   ===================================================== */
router.post(
  "/leave",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const leave = await Leave.create({
        driver: driver._id,
        busNo: driver.assignedBus,
        fromDate: req.body.fromDate,
        toDate: req.body.toDate,
        fromTime: req.body.fromTime,
        toTime: req.body.toTime,
        reason: req.body.reason
      });

      res.json({
        message: "Leave applied successfully",
        leave
      });

    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);


router.get(
  "/leave",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const leaves = await Leave.find({
        driver: driver._id
      })
        .sort({ createdAt: -1 });

      res.json(leaves);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


router.delete(
  "/leave/:id",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const leave = await Leave.findById(req.params.id);

      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // Ensure driver owns this leave
      if (leave.driverId !== driver.driverId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Optional: allow delete only if waiting
      if (leave.status !== "waiting") {
        return res.status(400).json({
          message: "Only waiting leave can be cancelled"
        });
      }

      await Leave.findByIdAndDelete(req.params.id);

      res.json({ message: "Leave cancelled successfully" });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);



router.get(
  "/announcement",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    const driver = await Driver.findOne({ userId: req.user.id });

    const announcements = await Announcement.find({
      audience: { $in: ["all", "drivers"] },
      $or: [
        { busNo: null },
        { busNo: driver.assignedBus }
      ]
    }).sort({ createdAt: -1 });

    res.json(announcements);
  }
);

// START
router.post("/trip/:id/start", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  trip.startTime = new Date();
  trip.status = "running";
  await trip.save();
  res.json({ message: "Trip started" });
});

// PAUSE
router.post("/trip/:id/pause", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  trip.pauseStart = new Date();
  trip.status = "paused";
  await trip.save();
  res.json({ message: "Trip paused" });
});

// RESUME
router.post("/trip/:id/resume", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  trip.pausedDuration += Date.now() - trip.pauseStart.getTime();
  trip.pauseStart = null;
  trip.status = "running";
  await trip.save();
  res.json({ message: "Trip resumed" });
});

// SKIP
router.post("/trip/:id/skip", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  trip.currentSegmentIndex++;
  await trip.save();
  res.json({ message: "Moved to next stop" });
});

// END
router.post("/trip/:id/end", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  trip.status = "completed";
  await trip.save();
  res.json({ message: "Trip ended" });
});




// ===============================
// DRIVER TRIP ETA + STATUS
// ===============================
router.get(
  "/trip/:busNo/eta",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const { busNo } = req.params;

      const trip = await Trip.findOne({
        busNo,
        status: { $in: ["running", "paused"] }
      });

      if (!trip) {
        return res.json({ message: "No active trip" });
      }

      const bus = await Bus.findOne({ busNo });
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
        } else if (i === currentIndex) {
          status = "current";
        }

        const etaTime = new Date(
          trip.startTime.getTime() +
          cumulativeMs +
          trip.pausedDuration
        );

        etaList.push({
          stop: bus.stops[i],
          eta: etaTime,
          status
        });
      }

      const progressPercent = Math.min(
        (effectiveElapsed / (trip.totalTime * 60000)) * 100,
        100
      );

      res.json({
        busNo,
        direction: trip.direction,
        status: trip.status,
        currentStop: bus.stops[currentIndex],
        nextStop: bus.stops[currentIndex + 1] || null,
        currentStopIndex: currentIndex,
        progressPercent,
        eta: etaList
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


router.post(
  "/feedback",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const { busNo, rating, category, message } = req.body;

      if (!busNo || !message) {
        return res.status(400).json({
          message: "busNo and message are required"
        });
      }

      const feedback = await Feedback.create({
        userId: req.user.id,
        role: "driver",
        busNo,
        rating: rating || 3,
        category: category || "general",
        message
      });

      res.json({
        message: "Feedback submitted successfully",
        feedback
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


















module.exports = router;