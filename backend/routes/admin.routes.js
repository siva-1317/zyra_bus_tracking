const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const fs = require("fs");
const multer = require("multer");
const csv = require("csv-parser");

const Bus = require("../models/Bus");
const Driver = require("../models/Driver");
const Student = require("../models/Student");
const Trip = require("../models/Trip");
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const Leave = require("../models/Leave");
const Announcement = require("../models/Announcement");

/* =====================================================
   ADD BUS
   ===================================================== */
router.post("/bus", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.json(bus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/* =====================================================
   GET ALL BUSES
   ===================================================== */
router.get("/bus", auth, allowRoles(["admin"]), async (req, res) => {
  const buses = await Bus.find();
  res.json(buses);
});

/* =====================================================
   UPDATE BUS (route / stops / timing)
   ===================================================== */
router.put("/bus/:busNo", auth, allowRoles(["admin"]), async (req, res) => {
  const bus = await Bus.findOneAndUpdate(
    { busNo: req.params.busNo },
    req.body,
    { new: true },
  );

  if (!bus) {
    return res.status(404).json({ message: "Bus not found" });
  }

  res.json(bus);
});

/* =====================================================
   DELETE BUS (SAFE DELETE)
   ===================================================== */
router.delete("/bus/:busNo", auth, allowRoles(["admin"]), async (req, res) => {
  const { busNo } = req.params;

  await Bus.deleteOne({ busNo });

  // Unassign driver
  await Driver.updateMany({ assignedBus: busNo }, { assignedBus: null });

  // Unassign students
  await Student.updateMany({ assignedBus: busNo }, { assignedBus: null });

  res.json({ message: "Bus removed successfully" });
});

/* =====================================================
   RESET BUS PROGRESS (Morning / Evening)
   ===================================================== */
router.put(
  "/bus-reset/:busNo",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    await Bus.findOneAndUpdate(
      { busNo: req.params.busNo },
      { currentStopIndex: 0 },
    );

    res.json({ message: "Bus progress reset" });
  },
);

// drivers

router.post("/driver", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { driverId, name, phone, licenseNo } = req.body;

    // Check if driver already exists
    const existing = await Driver.findOne({ driverId });
    if (existing) {
      return res.status(400).json({
        message: "Driver already exists",
      });
    }

    // 1️⃣ Create login account
    const hashedPassword = await bcrypt.hash("123456", 10); // default password

    const user = await User.create({
      username: driverId,
      password: hashedPassword,
      role: "driver",
    });

    // 2️⃣ Create driver profile
    const driver = await Driver.create({
      userId: user._id,
      driverId,
      name,
      phone,
      licenseNo,
    });

    res.json({
      message: "Driver created successfully",
      driver,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/driver", auth, allowRoles(["admin"]), async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers);
});

router.put(
  "/driver/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const driver = await Driver.findOneAndUpdate(
      { driverId: req.params.driverId },
      req.body,
      { new: true },
    );

    res.json(driver);
  },
);

router.get("/driver", auth, allowRoles(["admin"]), async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers);
});

router.put(
  "/driver/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({
        driverId: req.params.driverId,
      });

      if (!driver) {
        return res.status(404).json({
          message: "Driver not found",
        });
      }

      if (req.body.name !== undefined) driver.name = req.body.name;

      if (req.body.phone !== undefined) driver.phone = req.body.phone;

      if (req.body.licenseNo !== undefined)
        driver.licenseNo = req.body.licenseNo;

      await driver.save();

      res.json({
        message: "Driver updated successfully",
        driver,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

router.put("/assign-driver", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { driverId, busNo } = req.body;

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    // 🔥 UNASSIGN CASE
    if (!busNo) {
      // Remove driver from all buses
      await Bus.updateMany({ driverId }, { driverId: null });

      driver.assignedBus = null;
      await driver.save();

      return res.json({
        message: "Driver unassigned successfully",
      });
    }

    // 🔥 NORMAL ASSIGN CASE
    const bus = await Bus.findOne({ busNo });
    if (!bus) {
      return res.status(404).json({
        message: "Bus not found",
      });
    }

    // Remove driver from old buses
    await Bus.updateMany({ driverId }, { driverId: null });

    // Assign new bus
    driver.assignedBus = busNo;
    await driver.save();

    bus.driverId = driverId;
    await bus.save();

    res.json({
      message: "Driver assigned successfully",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put(
  "/reset-driver-password/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: "New password required",
      });
    }

    const driver = await Driver.findOne({
      driverId: req.params.driverId,
    });

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(driver.userId, {
      password: hashed,
    });

    res.json({
      message: "Driver password reset successfully",
    });
  },
);

router.delete(
  "/driver/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { driverId } = req.params;

      const driver = await Driver.findOne({ driverId });

      if (!driver) {
        return res.status(404).json({
          message: "Driver not found",
        });
      }

      // Remove from bus
      await Bus.updateMany({ driverId }, { driverId: null });

      // Delete linked user
      await User.findByIdAndDelete(driver.userId);

      // Delete driver profile
      await Driver.deleteOne({ driverId });

      res.json({
        message: "Driver removed successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  "/leave",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const leaves = await Leave.find()
        .populate("driver", "name driverId phone")
        .sort({ createdAt: -1 });

      res.json(leaves);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// ADMIN APPROVE / REJECT LEAVE
router.put(
  "/leave/:id",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { status, adminRemark } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status"
        });
      }

      const leave = await Leave.findById(req.params.id);

      if (!leave) {
        return res.status(404).json({
          message: "Leave not found"
        });
      }

      leave.status = status;

      if (adminRemark) {
        leave.adminRemark = adminRemark;
      }

      await leave.save();

      res.json({
        message: `Leave ${status} successfully`,
        leave
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


router.post("/announcement", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const announcement = await Announcement.create({
      title: req.body.title,
      message: req.body.message,
      audience: req.body.audience || "all",
      busNo: req.body.busNo || null,
    });

    res.json({
      message: "Announcement posted successfully",
      announcement,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===============================
// ADMIN ADD STUDENT
// ===============================
router.post("/student", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ===============================
// ADMIN ADD STUDENTS IN BULK
// ===============================

const upload = multer({ dest: "uploads/" });

router.post(
  "/upload-students",
  auth,
  allowRoles(["admin"]),
  upload.single("file"),
  async (req, res) => {

    console.log("FILE RECEIVED:", req.file);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const students = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => students.push(row))
      .on("end", async () => {

        console.log("Students:", students);
        console.log("Total rows:", students.length);

        for (const s of students) {
          console.log("Processing:", s.rollNumber);
        }

        res.json({ message: "Debug complete" });
      });
  }
);


// ===============================
// ADMIN GET ALL STUDENTS
// ===============================
router.get("/student", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===============================
// ADMIN GET SINGLE STUDENT
// ===============================
router.get(
  "/student/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const student = await Student.findOne({
        rollNumber: req.params.rollNumber,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// ===============================
// ADMIN UPDATE STUDENT DETAILS
// ===============================
router.put(
  "/student/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const student = await Student.findOne({
        rollNumber: req.params.rollNumber,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Basic info updates
      if (req.body.name !== undefined) student.name = req.body.name;

      if (req.body.department !== undefined)
        student.department = req.body.department;

      if (req.body.year !== undefined) student.year = req.body.year;

      if (req.body.phone !== undefined) student.phone = req.body.phone;

      // Bus-related changes (admin-only)
      if (req.body.busStop !== undefined) student.busStop = req.body.busStop;

      if (req.body.assignedBus !== undefined)
        student.assignedBus = req.body.assignedBus;

      await student.save();

      res.json({
        message: "Student details updated successfully",
        student,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
);

router.post(
  "/event-trip",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const {
        busNo,
        driverId,
        fromDate,
        toDate,
        startTime,
        endTime,
        destination,
        reason,
      } = req.body;

      if (
        !busNo ||
        !driverId ||
        !fromDate ||
        !toDate ||
        !startTime ||
        !endTime ||
        !destination ||
        !reason
      ) {
        return res.status(400).json({ message: "All fields required" });
      }

      const bus = await Bus.findOne({ busNo });
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }

      const trip = await Trip.create({
        busNo,
        driverId,
        fromDate,
        toDate,
        startTime,
        endTime,
        destination,
        reason,
        tripType: "event",
        status: "planned",
      });

      res.json({ message: "Event Trip Created", trip });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.get(
  "/trip-history/:busNo",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const trips = await Trip.find({
        busNo: req.params.busNo,
      }).sort({ createdAt: -1 });

      res.json(trips);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete(
  "/trip-history/:tripId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      await Trip.findByIdAndDelete(req.params.tripId);

      res.json({ message: "Trip deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  "/reset-student-password/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const { rollNumber } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password required" });
    }

    // 1. Find student
    const student = await Student.findOne({ rollNumber });
    if (!student || !student.userId) {
      return res.status(404).json({
        message: "Student account not found",
      });
    }

    // 2. Hash password
    const hashed = await bcrypt.hash(newPassword, 10);

    // 3. Update user password
    await User.findByIdAndUpdate(student.userId, {
      password: hashed,
      mustChangePassword: true, // optional but recommended
    });

    res.json({
      message: "Password reset successfully",
    });
  },
);

router.get("/announcement", async (req, res) => {
  const Announcement = require("../models/Announcement");
  const data = await Announcement.find().sort({ createdAt: -1 });
  res.json(data);
});

router.get("/feedback", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { busNo, role, status } = req.query;

    const filter = {};
    if (busNo) filter.busNo = busNo;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const feedbacks = await Feedback.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ===============================
// ADMIN → MARK FEEDBACK AS REVIEWED
// ===============================
router.put(
  "/feedback/:id/review",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const feedback = await Feedback.findById(req.params.id);

      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      feedback.status = "reviewed";
      await feedback.save();

      res.json({
        message: "Feedback marked as reviewed",
        feedback,
      });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


router.get("/trip-list", auth, allowRoles(["admin"]), async (req, res) => {
  const trips = await Trip.find().sort({ createdAt: -1 });
  res.json(trips);
});

router.get(
  "/dashboard-stats",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      // Buses
      const totalBuses = await Bus.countDocuments();

      // Trips
      const runningTrips = await Trip.countDocuments({ status: "running" });
      const plannedTrips = await Trip.countDocuments({ status: "planned" });
      const completedTrips = await Trip.countDocuments({ status: "completed" });

      // Students
      const totalStudents = await Student.countDocuments();
      const assignedStudents = await Student.countDocuments({
        assignedBus: { $ne: null },
      });
      const unassignedStudents = await Student.countDocuments({
        $or: [{ assignedBus: null }, { assignedBus: { $exists: false } }],
      });

      // Drivers
      const totalDrivers = await Driver.countDocuments();
      const assignedDrivers = await Driver.countDocuments({
        assignedBus: { $ne: null },
      });
      const unassignedDrivers = await Driver.countDocuments({
        $or: [{ assignedBus: null }, { assignedBus: { $exists: false } }],
      });

      // Feedback
      const totalFeedback = await Feedback.countDocuments();
      const reviewedFeedback = await Feedback.countDocuments({
        status: "reviewed",
      });
      const pendingFeedback = await Feedback.countDocuments({
        status: { $ne: "reviewed" },
      });

      res.json({
        buses: {
          totalBuses,
          runningTrips,
          plannedTrips,
          completedTrips,
        },
        students: {
          totalStudents,
          assignedStudents,
          unassignedStudents,
        },
        drivers: {
          totalDrivers,
          assignedDrivers,
          unassignedDrivers,
        },
        feedback: {
          totalFeedback,
          reviewedFeedback,
          pendingFeedback,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
