const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Driver = require("../models/Driver");
const Bus = require("../models/Bus");
const Trip = require("../models/Trip");
const Announcement = require("../models/Announcement");
const Feedback = require("../models/Feedback");
const BusComplaint = require("../models/BusComplaint");
const auth = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const complaintUploadDir = path.join("uploads", "bus-complaints");
if (!fs.existsSync(complaintUploadDir)) {
  fs.mkdirSync(complaintUploadDir, { recursive: true });
}

const complaintStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, complaintUploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const complaintUpload = multer({ storage: complaintStorage });

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
    }).sort({ createdAt: -1 }).limit(2);

    res.json(announcements);
  }
);








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
  "/trip/:id/start",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.status === "running") {
        return res.status(400).json({ message: "Trip already running" });
      }

      trip.startTime = new Date();
      trip.status = "running";
      trip.pausedDuration = 0;
      trip.pauseStart = null;

      await trip.save();

      res.json({
        message: "Trip started successfully",
        trip
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/trip/:id/end",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.status === "completed") {
        return res.status(400).json({ message: "Trip already completed" });
      }

      trip.status = "completed";
      trip.endTime = new Date();

      await trip.save();

      res.json({
        message: "Trip ended successfully"
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post("/trip/:id/location", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const { lat, lng } = req.body;

    // 🔥 FIXED VALIDATION
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    trip.currentLocation = { lat, lng };
    trip.lastLocationUpdate = new Date();

    await trip.save();

    res.json({ message: "Location updated successfully" });

  } catch (error) {
    console.log("Location error:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get(
  "/active-trip",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver || !driver.assignedBus) {
        return res.status(400).json({ message: "No bus assigned" });
      }

      const bus = await Bus.findOne({ busNo: driver.assignedBus });

      let trip = null;

      /* =================================================
         1️⃣ RUNNING TRIP (highest priority)
         ================================================= */
      trip = await Trip.findOne({
        driverId: driver._id,
        status: "running",
      });

      /* =================================================
         2️⃣ PAUSED TRIP
         ================================================= */
      if (!trip) {
        trip = await Trip.findOne({
          driverId: driver._id,
          status: "paused",
        });
      }

      /* =================================================
         3️⃣ PLANNED EVENT (assigned to driver)
         ================================================= */
      if (!trip) {
        trip = await Trip.findOne({
          driverId: driver._id,
          tripType: "event",
          status: "planned",
        }).sort({ createdAt: 1 });
      }

      /* =================================================
         4️⃣ PLANNED ROUTE
         ================================================= */
      if (!trip) {
        trip = await Trip.findOne({
          driverId: driver._id,
          tripType: "route",
          status: "planned",
        }).sort({ createdAt: 1 });
      }

      /* =================================================
         5️⃣ AUTO CREATE ROUTE IF NOTHING EXISTS
         ================================================= */
      if (!trip) {
        const totalTime = (bus.segmentTimes || []).reduce(
          (a, b) => a + b,
          0
        );

        trip = await Trip.create({
          busNo: bus.busNo,
          driverId: driver._id,
          segmentTimes: bus.segmentTimes || [],
          totalTime,
          tripType: "route",
          status: "planned",
        });
      }

      res.json({
        trip,
        bus,
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PAUSE
router.post("/trip/:id/pause", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  trip.pauseStart = new Date();
  trip.status = "paused";
  await trip.save();

  res.json({ message: "Trip paused" });
});

// RESUME
router.post("/trip/:id/resume", auth, allowRoles(["driver"]), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  trip.pausedDuration += Date.now() - trip.pauseStart.getTime();
  trip.pauseStart = null;
  trip.status = "running";
  await trip.save();

  res.json({ message: "Trip resumed" });
});

router.post(
  "/create-trip",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });

      if (!driver || !driver.assignedBus) {
        return res.status(400).json({ message: "No bus assigned" });
      }

      const bus = await Bus.findOne({ busNo: driver.assignedBus });
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }

      // Check existing active trip
      const existingTrip = await Trip.findOne({
        busNo: bus.busNo,
        status: { $ne: "completed" }
      });

      if (existingTrip) {
        return res.json(existingTrip);
      }

      const totalTime = (bus.segmentTimes || []).reduce((a, b) => a + b, 0);

      const trip = await Trip.create({
        busNo: bus.busNo,
        segmentTimes: bus.segmentTimes || [],
        totalTime,
        status: "idle"
      });

      res.json(trip);

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

router.post(
  "/bus-complaint",
  auth,
  allowRoles(["driver"]),
  complaintUpload.array("photos", 5),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      if (!driver.assignedBus) {
        return res.status(400).json({ message: "No assigned bus for complaint" });
      }

      const { complaintType, description } = req.body;
      if (!complaintType) {
        return res.status(400).json({ message: "Complaint type is required" });
      }

      const photoPaths = (req.files || []).map(
        (f) => `/${String(f.path).replace(/\\/g, "/")}`,
      );

      const complaint = await BusComplaint.create({
        driverId: driver._id,
        busNo: driver.assignedBus,
        complaintType,
        description: description || "",
        photos: photoPaths,
      });

      res.json({
        message: "Bus complaint submitted successfully",
        complaint,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  "/bus-complaint",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      const complaints = await BusComplaint.find({ driverId: driver._id }).sort({
        createdAt: -1,
      });
      res.json(complaints);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);




router.post(
  "/trip/:id/location",
  auth,
  allowRoles(["driver"]),
  async (req, res) => {
    try {
      const { lat, lng } = req.body;

      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      trip.currentLocation = { lat, lng };
      trip.lastLocationUpdate = new Date();

      await trip.save();

      res.json({ message: "Location updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


router.get(
  "/trip/:busNo/tracking",
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
      if (!bus) return res.status(404).json({ message: "Bus not found" });

      const now = Date.now();

      // =========================
      // CHECK GPS MODE
      // =========================
      const gpsTimeout = 30000; // 30 sec
      let trackingMode = "time";

      if (
        trip.lastLocationUpdate &&
        now - trip.lastLocationUpdate.getTime() < gpsTimeout
      ) {
        trackingMode = "gps";
      }

      // =========================
      // TIME-BASED CALCULATION
      // =========================
      const pausedDuration = trip.pausedDuration || 0;
      const effectiveElapsed =
        now - trip.startTime.getTime() - pausedDuration;

      let cumulativeMs = 0;
      let currentIndex = 0;

      const etaList = [];

      for (let i = 0; i < bus.stops.length; i++) {
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
            pausedDuration
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
        trackingMode,
        busLocation: trip.currentLocation || null,
        progressPercent,
        currentStopIndex: currentIndex,
        eta: etaList
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);




































module.exports = router;
