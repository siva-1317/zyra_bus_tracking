const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const csv = require("csv-parser");

const User = require("../models/User");
const Bus = require("../models/Bus");
const Driver = require("../models/Driver");
const Student = require("../models/Student");
const Trip = require("../models/Trip");
const Feedback = require("../models/Feedback");
const Leave = require("../models/Leave");
const Announcement = require("../models/Announcement");
const BusComplaint = require("../models/BusComplaint");
const CalendarNote = require("../models/CalendarNote");
const CalendarDailyHistory = require("../models/CalendarDailyHistory");

const auth = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const upload = multer({ dest: "uploads/" });

const getDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isTripOnDate = (trip, date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const startCandidate = trip.fromDate
    ? new Date(trip.fromDate)
    : trip.createdAt
      ? new Date(trip.createdAt)
      : null;

  if (!startCandidate || Number.isNaN(startCandidate.getTime())) return false;

  const endCandidate = trip.toDate ? new Date(trip.toDate) : startCandidate;
  return startCandidate <= dayEnd && endCandidate >= dayStart;
};

const getDateRangeKeys = (fromDate, toDate, createdAt = new Date()) => {
  const start = fromDate ? new Date(fromDate) : new Date(createdAt);
  const end = toDate ? new Date(toDate) : new Date(start);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [getDateKey(new Date())];
  }

  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  const from = startDay <= endDay ? startDay : endDay;
  const to = startDay <= endDay ? endDay : startDay;

  const keys = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const refreshCalendarHistoryForDate = async (dateKey, includeAssignments = true) => {
  try {
    const targetDate = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return;

    const [trips, drivers, buses, students] = await Promise.all([
      Trip.find(),
      Driver.find(),
      Bus.find(),
      Student.find(),
    ]);

    const dayTrips = trips.filter((trip) => isTripOnDate(trip, targetDate));
    const busesByNo = buses.reduce((acc, b) => {
      acc[b.busNo] = b;
      return acc;
    }, {});
    const driversById = drivers.reduce((acc, d) => {
      acc[String(d._id)] = d;
      return acc;
    }, {});

    const resolveDriverId = (driverField) => {
      if (!driverField) return "";
      if (typeof driverField === "string") return driverField;
      if (driverField._id) return String(driverField._id);
      return String(driverField);
    };

    const busesWithStudentsSet = new Set(
      students.map((s) => (s.assignedBus || "").trim()).filter(Boolean),
    );
    const busesWithDriverSet = new Set(
      buses
        .filter((b) => (b.driverId || "").trim())
        .map((b) => b.busNo)
        .filter(Boolean),
    );
    const assignedWorkingBusSet = new Set(
      Array.from(busesWithStudentsSet).filter((busNo) => busesWithDriverSet.has(busNo)),
    );
    const assignedWorkingDriverSet = new Set(
      drivers
        .filter((d) => (d.assignedBus || "").trim())
        .map((d) => String(d._id)),
    );

    const specialPlannedTrips = dayTrips.filter(
      (trip) => trip.tripType === "event" && trip.status === "planned",
    );
    const specialTripDetailsRaw = dayTrips.filter(
      (trip) =>
        trip.tripType === "event" &&
        ["planned", "completed"].includes(trip.status || ""),
    );
    const regularTripDetailsRaw = dayTrips.filter((trip) => trip.tripType !== "event");

    const specialTripBusSet = new Set(
      specialTripDetailsRaw.map((trip) => trip.busNo).filter(Boolean),
    );
    const dayBusSet = includeAssignments
      ? new Set([
        ...Array.from(assignedWorkingBusSet),
        ...Array.from(specialTripBusSet),
      ])
      : specialTripBusSet;

    const specialTripDriverSet = new Set(
      specialTripDetailsRaw
        .map((trip) => resolveDriverId(trip.driverId))
        .filter(Boolean),
    );
    const dayDriverSet = includeAssignments
      ? new Set([
        ...Array.from(assignedWorkingDriverSet),
        ...Array.from(specialTripDriverSet),
      ])
      : specialTripDriverSet;

    const workingBusDetails = Array.from(dayBusSet).map((busNo) => {
      const bus = busesByNo[busNo];
      return {
        busNo,
        routeName: bus?.routeName || "Route N/A",
      };
    });

    const workingDriverDetails = Array.from(dayDriverSet).map((driverKey) => {
      const driver = driversById[driverKey];
      return {
        id: driverKey,
        name: driver?.name || "N/A",
        driverId: driver?.driverId || "No Driver ID",
        phone: driver?.phone || "-",
        assignedBus: driver?.assignedBus || "-",
      };
    });

    const mapTripDetail = (trip) => {
      const driver =
        driversById[resolveDriverId(trip.driverId)] ||
        (typeof trip.driverId === "object" ? trip.driverId : null);
      const bus = busesByNo[trip.busNo];
      return {
        tripId: String(trip._id),
        busNo: trip.busNo || "N/A",
        routeName: bus?.routeName || "Route N/A",
        driverName: driver?.name || "N/A",
        driverCode: driver?.driverId || "No Driver ID",
        driverPhone: driver?.phone || "-",
        status: trip.status || "planned",
        startTime: trip.startTime || "-",
        endTime: trip.endTime || "-",
        fromDate: trip.fromDate || null,
        toDate: trip.toDate || null,
        destination: trip.destination || "-",
        reason: trip.reason || "-",
      };
    };

    await CalendarDailyHistory.findOneAndUpdate(
      { dateKey },
      {
        $set: {
          totalWorkingBuses: dayBusSet.size,
          totalWorkingDrivers: dayDriverSet.size,
          upcomingSpecialTrips: specialPlannedTrips.length,
          workingBusDetails,
          workingDriverDetails,
          specialTripDetails: specialTripDetailsRaw.map(mapTripDetail),
          regularTripDetails: regularTripDetailsRaw.map(mapTripDetail),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error(`Failed to refresh calendar history for ${dateKey}:`, err.message);
  }
};

const refreshTodayCalendarHistory = async () => {
  await refreshCalendarHistoryForDate(getDateKey(new Date()), true);
};

const refreshTripCalendarHistory = async (tripDoc, oldTripDoc = null) => {
  const keys = new Set();

  getDateRangeKeys(tripDoc?.fromDate, tripDoc?.toDate, tripDoc?.createdAt).forEach((k) =>
    keys.add(k),
  );
  if (oldTripDoc) {
    getDateRangeKeys(oldTripDoc?.fromDate, oldTripDoc?.toDate, oldTripDoc?.createdAt).forEach(
      (k) => keys.add(k),
    );
  }

  for (const key of keys) {
    await refreshCalendarHistoryForDate(key, false);
  }
};

/* =====================================================
   🚌 BUS MANAGEMENT
===================================================== */

// ADD BUS
router.post("/bus", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.json(bus);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET BUSES
router.get("/bus", auth, allowRoles(["admin"]), async (req, res) => {
  const buses = await Bus.find();
  res.json(buses);
});

// LIVE BUS STATUS + LOCATION (ADMIN)
router.get("/bus-live", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const buses = await Bus.find();

    const live = await Promise.all(
      buses.map(async (bus) => {
        const activeTrip = await Trip.findOne({
          busNo: bus.busNo,
          status: { $in: ["running", "paused"] },
        }).sort({ createdAt: -1 });

        let status = "not-running";
        let location = null;
        let lastUpdate = null;

        if (activeTrip) {
          status = activeTrip.status || "running";
          location = activeTrip.currentLocation || null;
          lastUpdate = activeTrip.lastLocationUpdate || null;
        } else {
          const lastTrip = await Trip.findOne({ busNo: bus.busNo })
            .sort({ createdAt: -1 })
            .select("status");
          if (lastTrip?.status === "completed") status = "completed";
        }

        if (!location && bus.stops?.length > 0) {
          const firstStop = bus.stops[0];
          if (firstStop?.lat && firstStop?.lng) {
            location = { lat: firstStop.lat, lng: firstStop.lng };
          }
        }

        return {
          busNo: bus.busNo,
          routeName: bus.routeName,
          driverId: bus.driverId || null,
          status,
          location,
          lastUpdate,
        };
      }),
    );

    res.json(live);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE BUS
router.put("/bus/:busNo", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const bus = await Bus.findOne({ busNo: req.params.busNo });
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    const oldTotal = Number(bus.totalSeats) || 0;
    const oldAvailable = Number(bus.availableSeats ?? oldTotal);
    const newTotal = Number(req.body.totalSeats) || oldTotal;

    if (req.body.routeName !== undefined) bus.routeName = req.body.routeName;

    if (req.body.stops !== undefined) bus.stops = req.body.stops;
    if (req.body.tripStartMorning !== undefined)
      bus.tripStartMorning = req.body.tripStartMorning;
    if (req.body.tripEndMorning !== undefined)
      bus.tripEndMorning = req.body.tripEndMorning;
    if (req.body.tripStartEvening !== undefined)
      bus.tripStartEvening = req.body.tripStartEvening;
    if (req.body.tripEndEvening !== undefined)
      bus.tripEndEvening = req.body.tripEndEvening;
    if (req.body.conditionStatus !== undefined)
      bus.conditionStatus = req.body.conditionStatus;

    bus.totalSeats = newTotal;

    const bookedSeats = oldTotal - oldAvailable;
    let newAvailable = newTotal - bookedSeats;
    if (newAvailable < 0) newAvailable = 0;

    bus.availableSeats = newAvailable;

    await bus.save();
    await refreshTodayCalendarHistory();
    res.json(bus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE BUS
router.delete("/bus/:busNo", auth, allowRoles(["admin"]), async (req, res) => {
  const { busNo } = req.params;

  await Bus.deleteOne({ busNo });
  await Driver.updateMany({ assignedBus: busNo }, { assignedBus: null });
  await Student.updateMany({ assignedBus: busNo }, { assignedBus: null });
  await refreshTodayCalendarHistory();

  res.json({ message: "Bus removed successfully" });
});

// RESET BUS PROGRESS
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

router.get("/bus-complaints", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const complaints = await BusComplaint.find()
      .populate("driverId", "driverId name assignedBus")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put(
  "/bus-complaints/:id/review",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { status, adminAction, adminRemark } = req.body;
      const complaint = await BusComplaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: "Complaint not found" });

      if (status) complaint.status = status;
      if (adminAction) complaint.adminAction = adminAction;
      if (adminRemark !== undefined) complaint.adminRemark = adminRemark;
      complaint.reviewedBy = req.user.id;
      complaint.reviewedAt = new Date();
      await complaint.save();

      if (complaint.adminAction === "need-repair") {
        await Bus.findOneAndUpdate(
          { busNo: complaint.busNo },
          { conditionStatus: "need-repair" },
        );
      } else if (complaint.adminAction === "resolved") {
        await Bus.findOneAndUpdate(
          { busNo: complaint.busNo },
          { conditionStatus: "good" },
        );
      }

      res.json({ message: "Complaint reviewed successfully", complaint });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get("/alternative-buses", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { fromBusNo } = req.query;
    const candidates = await Bus.find({
      ...(fromBusNo ? { busNo: { $ne: fromBusNo } } : {}),
      driverId: { $in: [null, ""] },
      conditionStatus: { $ne: "need-repair" },
    }).select("busNo routeName");

    const available = [];
    for (const bus of candidates) {
      const [activeTrip, assignedStudents] = await Promise.all([
        Trip.findOne({
          busNo: bus.busNo,
          status: { $in: ["running", "paused", "planned"] },
        }).select("_id"),
        Student.findOne({ assignedBus: bus.busNo }).select("_id"),
      ]);
      if (!activeTrip && !assignedStudents) available.push(bus);
    }

    res.json(available);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/swap-bus", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { fromBusNo, toBusNo } = req.body;
    if (!fromBusNo || !toBusNo) {
      return res.status(400).json({ message: "fromBusNo and toBusNo are required" });
    }
    if (fromBusNo === toBusNo) {
      return res.status(400).json({ message: "From and To bus cannot be same" });
    }

    const [fromBus, toBus] = await Promise.all([
      Bus.findOne({ busNo: fromBusNo }),
      Bus.findOne({ busNo: toBusNo }),
    ]);
    if (!fromBus || !toBus) return res.status(404).json({ message: "Bus not found" });
    if (toBus.driverId) {
      return res.status(400).json({ message: "Alternative bus already has a driver" });
    }

    const [activeTripOnTo, assignedStudentsOnTo] = await Promise.all([
      Trip.findOne({
        busNo: toBusNo,
        status: { $in: ["running", "paused", "planned"] },
      }).select("_id"),
      Student.findOne({ assignedBus: toBusNo }).select("_id"),
    ]);
    if (activeTripOnTo || assignedStudentsOnTo) {
      return res.status(400).json({ message: "Alternative bus is already assigned work" });
    }

    const fromBusDetails = {
      routeName: fromBus.routeName,
      stops: fromBus.stops,
      tripStartMorning: fromBus.tripStartMorning,
      tripEndMorning: fromBus.tripEndMorning,
      tripStartEvening: fromBus.tripStartEvening,
      tripEndEvening: fromBus.tripEndEvening,
    };

    const toBusDetails = {
      routeName: toBus.routeName,
      stops: toBus.stops,
      tripStartMorning: toBus.tripStartMorning,
      tripEndMorning: toBus.tripEndMorning,
      tripStartEvening: toBus.tripStartEvening,
      tripEndEvening: toBus.tripEndEvening,
    };

    const [driver] = await Promise.all([
      Driver.findOne({ assignedBus: fromBusNo }),
      Student.updateMany({ assignedBus: fromBusNo }, { assignedBus: toBusNo }),
      Trip.updateMany(
        { busNo: fromBusNo, status: { $in: ["running", "paused", "planned", "idle"] } },
        { busNo: toBusNo },
      ),
      BusComplaint.updateMany(
        { busNo: fromBusNo, status: { $in: ["pending", "in-review"] } },
        { adminAction: "need-repair" },
      ),
    ]);

    if (driver) {
      driver.assignedBus = toBusNo;
      await driver.save();
    }

    fromBus.driverId = null;
    fromBus.conditionStatus = "need-repair";
    fromBus.availableSeats = fromBus.totalSeats;
    fromBus.routeName = toBusDetails.routeName;
    fromBus.stops = toBusDetails.stops;
    fromBus.tripStartMorning = toBusDetails.tripStartMorning;
    fromBus.tripEndMorning = toBusDetails.tripEndMorning;
    fromBus.tripStartEvening = toBusDetails.tripStartEvening;
    fromBus.tripEndEvening = toBusDetails.tripEndEvening;
    await fromBus.save();

    toBus.driverId = driver ? driver.driverId : null;
    toBus.conditionStatus = "good";
    toBus.routeName = fromBusDetails.routeName;
    toBus.stops = fromBusDetails.stops;
    toBus.tripStartMorning = fromBusDetails.tripStartMorning;
    toBus.tripEndMorning = fromBusDetails.tripEndMorning;
    toBus.tripStartEvening = fromBusDetails.tripStartEvening;
    toBus.tripEndEvening = fromBusDetails.tripEndEvening;
    const assignedToNewBus = await Student.countDocuments({ assignedBus: toBusNo });
    toBus.availableSeats = Math.max((toBus.totalSeats || 0) - assignedToNewBus, 0);
    await toBus.save();
    await refreshTodayCalendarHistory();

    res.json({
      message: `Bus updated successfully: ${fromBusNo} -> ${toBusNo}`,
      fromBusNo,
      toBusNo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   👨‍✈️ DRIVER MANAGEMENT
===================================================== */

router.post("/driver", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { driverId, name, phone, licenseNo } = req.body;

    const existing = await Driver.findOne({ driverId });
    if (existing)
      return res.status(400).json({ message: "Driver already exists" });

    const hashedPassword = await bcrypt.hash("123456", 10);

    const user = await User.create({
      username: driverId,
      password: hashedPassword,
      role: "driver",
    });

    const driver = await Driver.create({
      userId: user._id,
      driverId,
      name,
      phone,
      licenseNo,
    });

    res.json({ message: "Driver created successfully", driver });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/driver", auth, allowRoles(["admin"]), async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers);
});

router.put(
  "/reset-driver-password/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { newPassword } = req.body || {};
      if (!newPassword || String(newPassword).trim().length < 4) {
        return res.status(400).json({ message: "New password must be at least 4 characters" });
      }

      const driver = await Driver.findOne({ driverId: req.params.driverId }).select("userId driverId");
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      const user = await User.findById(driver.userId);
      if (!user) return res.status(404).json({ message: "Driver login user not found" });

      user.password = await bcrypt.hash(String(newPassword), 10);
      await user.save();

      res.json({ message: `Password reset successfully for ${driver.driverId}` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ASSIGN / UNASSIGN DRIVER TO BUS
router.put("/assign-driver", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { driverId, busNo } = req.body;
    if (!driverId) return res.status(400).json({ message: "Driver ID required" });

    const driver = await Driver.findOne({ driverId });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Unassign current bus from driver if any
    if (driver.assignedBus) {
      await Bus.findOneAndUpdate(
        { busNo: driver.assignedBus },
        { driverId: null },
      );
    }

    // If no busNo provided, just unassign and return
    if (!busNo) {
      driver.assignedBus = null;
      await driver.save();
      await refreshTodayCalendarHistory();
      return res.json({ message: "Driver unassigned from bus", driver });
    }

    const bus = await Bus.findOne({ busNo });
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    // If another driver is assigned to this bus, unassign them
    if (bus.driverId && bus.driverId !== driverId) {
      await Driver.findOneAndUpdate(
        { driverId: bus.driverId },
        { assignedBus: null },
      );
    }

    bus.driverId = driverId;
    await bus.save();

    driver.assignedBus = busNo;
    await driver.save();
    await refreshTodayCalendarHistory();

    res.json({ message: "Driver assigned to bus", driver, bus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put(
  "/driver/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ driverId: req.params.driverId });
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      if (req.body.name !== undefined) driver.name = req.body.name;
      if (req.body.phone !== undefined) driver.phone = req.body.phone;
      if (req.body.licenseNo !== undefined)
        driver.licenseNo = req.body.licenseNo;

      await driver.save();
      res.json({ message: "Driver updated successfully", driver });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

router.delete(
  "/driver/:driverId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({ driverId: req.params.driverId });
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      await Bus.updateMany({ driverId: driver.driverId }, { driverId: null });
      await User.findByIdAndDelete(driver.userId);
      await Driver.deleteOne({ driverId: driver.driverId });
      await refreshTodayCalendarHistory();

      res.json({ message: "Driver removed successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

/* =====================================================
   🎓 STUDENT MANAGEMENT
===================================================== */

// FIXED ADD STUDENT
router.post("/student", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { rollNumber, name, department, year, phone } = req.body;
    const normalizedRollNumber = String(rollNumber || "").trim();

    if (!normalizedRollNumber) {
      return res.status(400).json({ message: "Roll Number required" });
    }

    const parsedYear =
      year === undefined || year === null || year === ""
        ? undefined
        : Number(year);

    if (parsedYear !== undefined && Number.isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year" });
    }

    const existing = await Student.findOne({ rollNumber: normalizedRollNumber });
    if (existing)
      return res.status(400).json({ message: "Student already exists" });

    const student = await Student.create({
      rollNumber: normalizedRollNumber,
      name,
      department,
      year: parsedYear,
      phone,
      // Works even if an old non-sparse unique index on userId still exists.
      userId: new mongoose.Types.ObjectId(),
      accountCreated: false,
    });
    await refreshTodayCalendarHistory();

    res.json({
      message:
        "Student created successfully. Student can now create account with roll number.",
      student,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE STUDENT
router.delete(
  "/delete-student/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const student = await Student.findOne({
        rollNumber: req.params.rollNumber,
      });
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      if (student.userId) await User.findByIdAndDelete(student.userId);

      await Student.deleteOne({ rollNumber: req.params.rollNumber });
      await refreshTodayCalendarHistory();

      res.json({ message: "Student removed successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// GET STUDENTS
router.get("/student", auth, allowRoles(["admin"]), async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

// GET SINGLE STUDENT
router.get(
  "/student/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const student = await Student.findOne({
      rollNumber: req.params.rollNumber,
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json(student);
  },
);

router.put(
  "/reset-student-password/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { newPassword } = req.body || {};
      if (!newPassword || String(newPassword).trim().length < 4) {
        return res.status(400).json({ message: "New password must be at least 4 characters" });
      }

      const student = await Student.findOne({ rollNumber: req.params.rollNumber })
        .select("userId rollNumber accountCreated");
      if (!student) return res.status(404).json({ message: "Student not found" });

      if (!student.accountCreated) {
        return res.status(400).json({ message: "Student account not created yet" });
      }

      const user = await User.findById(student.userId);
      if (!user) {
        return res.status(404).json({ message: "Student login user not found" });
      }

      user.password = await bcrypt.hash(String(newPassword), 10);
      await user.save();

      res.json({ message: `Password reset successfully for ${student.rollNumber}` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// UPDATE STUDENT
router.put(
  "/student/:rollNumber",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const student = await Student.findOne({
        rollNumber: req.params.rollNumber,
      });
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      if (req.body.name !== undefined) student.name = req.body.name;
      if (req.body.department !== undefined)
        student.department = req.body.department;
      if (req.body.year !== undefined) student.year = req.body.year;
      if (req.body.phone !== undefined) student.phone = req.body.phone;
      if (req.body.busStop !== undefined) student.busStop = req.body.busStop;
      if (req.body.assignedBus !== undefined) {
        const oldBusNo = student.assignedBus;
        const newBusNo = req.body.assignedBus;

        // If student already had a bus and changing it
        if (oldBusNo && oldBusNo !== newBusNo) {
          await Bus.findOneAndUpdate(
            { busNo: oldBusNo },
            { $inc: { availableSeats: 1 } },
          );
        }

        // If assigning new bus
        if (newBusNo) {
          const bus = await Bus.findOne({ busNo: newBusNo });

          if (!bus) return res.status(404).json({ message: "Bus not found" });

          if (bus.availableSeats <= 0)
            return res.status(400).json({ message: "Bus is full" });

          await Bus.findOneAndUpdate(
            { busNo: newBusNo },
            { $inc: { availableSeats: -1 } },
          );
        }

        student.assignedBus = newBusNo;
      }
      await student.save();
      await refreshTodayCalendarHistory();
      res.json({ message: "Student updated successfully", student });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

// BULK UPLOAD STUDENTS
router.post(
  "/upload-students",
  auth,
  allowRoles(["admin"]),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const students = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => students.push(row))
      .on("end", async () => {
        const normalizeKey = (key) =>
          key
            .toString()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/_/g, "");

        const getValue = (row, keys) => {
          const normalizedRow = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[normalizeKey(k)] = row[k];
          });
          for (const k of keys) {
            const v = normalizedRow[normalizeKey(k)];
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              return String(v).trim();
            }
          }
          return "";
        };

        const results = {
          created: 0,
          skipped: 0,
          errors: [],
        };

        try {
          for (const row of students) {
            const rollNumber = getValue(row, [
              "rollNumber",
              "rollNo",
              "rollno",
              "roll_number",
              "roll",
            ]);

            const name = getValue(row, ["name", "studentName"]);
            const department = getValue(row, ["department", "dept"]);
            const yearRaw = getValue(row, ["year", "classYear"]);
            const phone = getValue(row, ["phone", "mobile", "contact"]);

            if (!rollNumber) {
              results.skipped += 1;
              results.errors.push({
                row,
                message: "Missing rollNumber",
              });
              continue;
            }

            const existing = await Student.findOne({ rollNumber });
            if (existing) {
              results.skipped += 1;
              results.errors.push({
                row,
                message: `Student already exists: ${rollNumber}`,
              });
              continue;
            }

            await Student.create({
              rollNumber,
              name,
              department,
              year: yearRaw ? Number(yearRaw) : undefined,
              phone,
              userId: new mongoose.Types.ObjectId(),
              accountCreated: false,
            });

            results.created += 1;
          }

          fs.unlink(req.file.path, () => {});

          res.json({
            message: "Upload processed",
            total: students.length,
            created: results.created,
            skipped: results.skipped,
            errors: results.errors,
          });
        } catch (err) {
          fs.unlink(req.file.path, () => {});
          res.status(500).json({ message: err.message });
        }
      });
  },
);

router.delete(
  "/students/bulk",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { mode, rollNumbers, year, department } = req.body || {};
      let filter = {};

      if (mode === "selected") {
        if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
          return res.status(400).json({ message: "rollNumbers are required for selected mode" });
        }
        filter = { rollNumber: { $in: rollNumbers } };
      } else if (mode === "year") {
        const parsedYear = Number(year);
        if (Number.isNaN(parsedYear)) {
          return res.status(400).json({ message: "Valid year is required for year mode" });
        }
        filter = { year: parsedYear };
      } else if (mode === "department") {
        const dept = String(department || "").trim();
        if (!dept) {
          return res.status(400).json({ message: "Department is required for department mode" });
        }
        filter = { department: dept };
      } else {
        return res.status(400).json({ message: "Invalid mode. Use selected, year, or department" });
      }

      const students = await Student.find(filter).select("rollNumber userId");
      if (students.length === 0) {
        return res.json({ message: "No students matched the filter", deletedCount: 0 });
      }

      const studentRolls = students.map((s) => s.rollNumber);
      const userIds = students.map((s) => s.userId).filter(Boolean);

      if (userIds.length > 0) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
      const result = await Student.deleteMany({ rollNumber: { $in: studentRolls } });
      await refreshTodayCalendarHistory();

      res.json({
        message: "Students deleted successfully",
        deletedCount: result.deletedCount || 0,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete(
  "/drivers/bulk",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const { mode, driverIds, status } = req.body || {};
      let filter = {};

      if (mode === "selected") {
        if (!Array.isArray(driverIds) || driverIds.length === 0) {
          return res.status(400).json({ message: "driverIds are required for selected mode" });
        }
        filter = { driverId: { $in: driverIds } };
      } else if (mode === "status") {
        if (status === "assigned") {
          filter = { assignedBus: { $nin: [null, ""] } };
        } else if (status === "unassigned") {
          filter = { $or: [{ assignedBus: null }, { assignedBus: "" }, { assignedBus: { $exists: false } }] };
        } else {
          return res.status(400).json({ message: "Invalid status. Use assigned or unassigned" });
        }
      } else {
        return res.status(400).json({ message: "Invalid mode. Use selected or status" });
      }

      const drivers = await Driver.find(filter).select("driverId userId");
      if (drivers.length === 0) {
        return res.json({ message: "No drivers matched the filter", deletedCount: 0 });
      }

      const ids = drivers.map((d) => d.driverId);
      const userIds = drivers.map((d) => d.userId).filter(Boolean);

      await Bus.updateMany({ driverId: { $in: ids } }, { driverId: null });
      if (userIds.length > 0) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
      const result = await Driver.deleteMany({ driverId: { $in: ids } });
      await refreshTodayCalendarHistory();

      res.json({
        message: "Drivers deleted successfully",
        deletedCount: result.deletedCount || 0,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

/* =====================================================
   📢 ANNOUNCEMENTS
===================================================== */

router.post("/announcement", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const announcement = await Announcement.create(req.body);
    res.json({ message: "Announcement posted", announcement });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/announcement", async (req, res) => {
  const data = await Announcement.find().sort({ createdAt: -1 });
  res.json(data);
});

router.delete("/announcement/:id", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/announcement", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { mode, ids } = req.body || {};
    let filter = {};

    if (mode === "selected") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids are required for selected mode" });
      }
      filter = { _id: { $in: ids } };
    } else if (mode === "last_week") {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      filter = { createdAt: { $gte: fromDate } };
    } else if (mode === "last_month") {
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 1);
      filter = { createdAt: { $gte: fromDate } };
    } else {
      return res.status(400).json({ message: "Invalid mode. Use selected, last_week, or last_month" });
    }

    const result = await Announcement.deleteMany(filter);
    res.json({
      message: "Announcements cleared successfully",
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   🧳 TRIP MANAGEMENT
===================================================== */

router.get("/calendar-notes", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.dateKey = {};
      if (from) filter.dateKey.$gte = from;
      if (to) filter.dateKey.$lte = to;
    }

    const notes = await CalendarNote.find(filter).sort({
      dateKey: 1,
      createdAt: -1,
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/calendar-notes", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { dateKey, title = "", note = "" } = req.body;

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ message: "Valid dateKey (YYYY-MM-DD) is required" });
    }

    if (!note.trim()) {
      return res.status(400).json({ message: "Note is required" });
    }

    const created = await CalendarNote.create({
      dateKey,
      title: title.trim(),
      note: note.trim(),
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ message: "Calendar note added", note: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/calendar-notes", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { year, month } = req.body || {};
    const y = Number(year);
    const m = Number(month);

    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "year and month (1-12) are required" });
    }

    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const to = `${y}-${String(m).padStart(2, "0")}-31`;

    const result = await CalendarNote.deleteMany({
      dateKey: { $gte: from, $lte: to },
    });

    res.json({
      message: "Calendar notes cleared successfully",
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/calendar-notes/:id", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    await CalendarNote.findByIdAndDelete(req.params.id);
    res.json({ message: "Calendar note deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/calendar-daily-history", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.dateKey = {};
      if (from) filter.dateKey.$gte = from;
      if (to) filter.dateKey.$lte = to;
    }

    const rows = await CalendarDailyHistory.find(filter).sort({ dateKey: 1 });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/calendar-daily-history", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const {
      dateKey,
      totalWorkingBuses = 0,
      totalWorkingDrivers = 0,
      upcomingSpecialTrips = 0,
      workingBusDetails = [],
      workingDriverDetails = [],
      specialTripDetails = [],
      regularTripDetails = [],
    } = req.body || {};

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ message: "Valid dateKey (YYYY-MM-DD) is required" });
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    if (dateKey !== todayKey) {
      return res.status(400).json({ message: "Only today's date can be updated" });
    }

    const row = await CalendarDailyHistory.findOneAndUpdate(
      { dateKey },
      {
        $set: {
          totalWorkingBuses: Number(totalWorkingBuses) || 0,
          totalWorkingDrivers: Number(totalWorkingDrivers) || 0,
          upcomingSpecialTrips: Number(upcomingSpecialTrips) || 0,
          workingBusDetails: Array.isArray(workingBusDetails) ? workingBusDetails : [],
          workingDriverDetails: Array.isArray(workingDriverDetails) ? workingDriverDetails : [],
          specialTripDetails: Array.isArray(specialTripDetails) ? specialTripDetails : [],
          regularTripDetails: Array.isArray(regularTripDetails) ? regularTripDetails : [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({ message: "Calendar daily history updated", row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/calendar-daily-history", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { year, month } = req.body || {};
    const y = Number(year);
    const m = Number(month);

    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "year and month (1-12) are required" });
    }

    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const to = `${y}-${String(m).padStart(2, "0")}-31`;

    const result = await CalendarDailyHistory.deleteMany({
      dateKey: { $gte: from, $lte: to },
    });

    res.json({
      message: "Calendar history cleared successfully",
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/event-trip", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const trip = await Trip.create({
      ...req.body,
      tripType: "event",
      status: "planned",
    });
    await refreshTripCalendarHistory(trip);
    res.json({ message: "Event Trip Created", trip });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/trip-list", auth, allowRoles(["admin"]), async (req, res) => {
  const trips = await Trip.find().sort({ createdAt: -1 });
  res.json(trips);
});

router.put("/trip/:tripId", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    const oldTrip = trip.toObject();

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

    if (busNo !== undefined) trip.busNo = busNo;
    if (driverId !== undefined) trip.driverId = driverId || null;
    if (fromDate !== undefined) trip.fromDate = fromDate || null;
    if (toDate !== undefined) trip.toDate = toDate || null;
    if (startTime !== undefined) trip.startTime = startTime;
    if (endTime !== undefined) trip.endTime = endTime;
    if (destination !== undefined) trip.destination = destination;
    if (reason !== undefined) trip.reason = reason;

    await trip.save();
    await refreshTripCalendarHistory(trip, oldTrip);
    res.json({ message: "Trip updated successfully", trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/trip-history/:busNo",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const trips = await Trip.find({ busNo: req.params.busNo }).sort({
      createdAt: -1,
    });
    res.json(trips);
  },
);

router.delete(
  "/trip-history/:tripId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const trip = await Trip.findById(req.params.tripId);
    await Trip.findByIdAndDelete(req.params.tripId);
    if (trip) await refreshTripCalendarHistory(trip);
    res.json({ message: "Trip deleted successfully" });
  },
);

router.delete(
  "/trip/:tripId",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    const trip = await Trip.findById(req.params.tripId);
    await Trip.findByIdAndDelete(req.params.tripId);
    if (trip) await refreshTripCalendarHistory(trip);
    res.json({ message: "Trip deleted successfully" });
  },
);

/* =====================================================
   📝 LEAVE MANAGEMENT
===================================================== */

router.get("/leave", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const leaves = await Leave.find({ reviewed: false })
      .populate("driver")
      .sort({ createdAt: -1 });

    res.json(leaves);

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/leave/:id", auth, allowRoles(["admin"]), async (req, res) => {
  try {
    const { status, adminRemark } = req.body;

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    leave.adminRemark = adminRemark;
    leave.reviewedAt = new Date();
    leave.reviewed = true;   // important

    await leave.save();

    res.json({ message: "Leave updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


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














router.get(
  "/dashboard-stats",
  auth,
  allowRoles(["admin"]),
  async (req, res) => {
    try {
      const now = new Date();

      const [
        totalBuses,
        runningTrips,
        plannedTrips,
        completedTrips,
        totalStudents,
        assignedStudents,
        unassignedStudents,
        departmentWiseRaw,
        genderWiseRaw,
        totalDrivers,
        assignedDrivers,
        unassignedDrivers,
        totalFeedback,
        reviewedFeedback,
        pendingFeedback,
        totalLeaveRequests,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
      ] = await Promise.all([
        Bus.countDocuments(),
        Trip.countDocuments({ status: "running" }),
        Trip.countDocuments({ status: "planned" }),
        Trip.countDocuments({ status: "completed" }),
        Student.countDocuments(),
        Student.countDocuments({
          assignedBus: { $nin: [null, ""] },
        }),
        Student.countDocuments({
          $or: [{ assignedBus: null }, { assignedBus: "" }, { assignedBus: { $exists: false } }],
        }),
        Student.aggregate([
          {
            $group: {
              _id: {
                $trim: {
                  input: { $ifNull: ["$department", "Unknown"] },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, department: "$_id", count: 1 } },
          { $sort: { count: -1, department: 1 } },
        ]),
        Student.aggregate([
          {
            $group: {
              _id: {
                $trim: {
                  input: { $ifNull: ["$gender", "Unknown"] },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, gender: "$_id", count: 1 } },
          { $sort: { count: -1, gender: 1 } },
        ]),
        Driver.countDocuments(),
        Driver.countDocuments({
          assignedBus: { $nin: [null, ""] },
        }),
        Driver.countDocuments({
          $or: [{ assignedBus: null }, { assignedBus: "" }, { assignedBus: { $exists: false } }],
        }),
        Feedback.countDocuments(),
        Feedback.countDocuments({ status: "reviewed" }),
        Feedback.countDocuments({ status: { $ne: "reviewed" } }),
        Leave.countDocuments(),
        Leave.countDocuments({ status: "waiting" }),
        Leave.countDocuments({ status: "approved" }),
        Leave.countDocuments({ status: "rejected" }),
      ]);

      const specialTrips = await Trip.find({ tripType: "event" })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("busNo driverId destination reason fromDate toDate status createdAt");

      const specialTripSummary = {
        total: await Trip.countDocuments({ tripType: "event" }),
        planned: await Trip.countDocuments({ tripType: "event", status: "planned" }),
        running: await Trip.countDocuments({ tripType: "event", status: "running" }),
        completed: await Trip.countDocuments({ tripType: "event", status: "completed" }),
      };

      const leaveDriverIds = await Leave.distinct("driver", {
        status: { $in: ["waiting", "approved"] },
        fromDate: { $lte: now },
        toDate: { $gte: now },
      });

      const leaveDrivers = await Driver.find({ _id: { $in: leaveDriverIds } })
        .select("driverId name assignedBus");

      const workingDrivers = await Driver.countDocuments({
        assignedBus: { $nin: [null, ""] },
        _id: { $nin: leaveDriverIds },
      });

      const availableDrivers = await Driver.countDocuments({
        assignedBus: { $in: [null, ""] },
        _id: { $nin: leaveDriverIds },
      });

      const workingBuses = await Bus.countDocuments({
        tripStatus: { $in: ["running"] },
      });

      const faultBuses = await Bus.find({
        tripStatus: { $in: ["paused"] },
      }).select("busNo routeName driverId tripStatus updatedAt");

      const busHistory = await Bus.aggregate([
        {
          $lookup: {
            from: "trips",
            localField: "busNo",
            foreignField: "busNo",
            as: "tripDocs",
          },
        },
        {
          $addFields: {
            totalTrips: { $size: "$tripDocs" },
            runningTripCount: {
              $size: {
                $filter: {
                  input: "$tripDocs",
                  as: "t",
                  cond: { $eq: ["$$t.status", "running"] },
                },
              },
            },
            completedTripCount: {
              $size: {
                $filter: {
                  input: "$tripDocs",
                  as: "t",
                  cond: { $eq: ["$$t.status", "completed"] },
                },
              },
            },
            plannedTripCount: {
              $size: {
                $filter: {
                  input: "$tripDocs",
                  as: "t",
                  cond: { $eq: ["$$t.status", "planned"] },
                },
              },
            },
            lastTrip: { $arrayElemAt: ["$tripDocs", -1] },
          },
        },
        {
          $project: {
            _id: 0,
            busNo: 1,
            routeName: 1,
            driverId: 1,
            tripStatus: 1,
            totalTrips: 1,
            runningTripCount: 1,
            completedTripCount: 1,
            plannedTripCount: 1,
            lastTripStatus: "$lastTrip.status",
            lastTripUpdatedAt: "$lastTrip.updatedAt",
          },
        },
        { $sort: { busNo: 1 } },
      ]);

      res.json({
        buses: {
          totalBuses,
          workingBuses,
          faultBusesCount: faultBuses.length,
          faultBusDetails: faultBuses,
          busHistory,
          runningTrips,
          plannedTrips,
          completedTrips,
        },
        students: {
          totalStudents,
          assignedStudents,
          unassignedStudents, // not bus assigned
          departmentWise: departmentWiseRaw,
          genderWise: genderWiseRaw,
        },
        drivers: {
          totalDrivers,
          workingDrivers,
          leaveDrivers: leaveDrivers.length,
          leaveDriverDetails: leaveDrivers,
          availableDrivers,
          assignedDrivers,
          unassignedDrivers,
        },
        specialTrips: {
          ...specialTripSummary,
          details: specialTrips,
        },
        feedback: {
          totalFeedback,
          reviewedFeedback,
          pendingFeedback,
        },
        leave: {
          totalLeaveRequests,
          pendingLeaveRequests,
          approvedLeaveRequests,
          rejectedLeaveRequests,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);













module.exports = router;
