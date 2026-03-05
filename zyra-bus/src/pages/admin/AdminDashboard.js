import { useEffect, useState } from "react";
import { Row, Col, Form, Button, Modal, Badge } from "react-bootstrap";
import { FaEye, FaRegStickyNote, FaTrashAlt } from "react-icons/fa";
import API from "../../api";
import { toast } from "../../utils/toast";
import "../../styles/neumorph-dashboard.css";

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AdminDashboard() {

  const [stats, setStats] = useState(null);
  const [fetchedStats, setFetchedStats] = useState(null);
  const [calendarTrips, setCalendarTrips] = useState([]);
  const [calendarDrivers, setCalendarDrivers] = useState([]);
  const [calendarBuses, setCalendarBuses] = useState([]);
  const [calendarStudents, setCalendarStudents] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [clearPickerOpen, setClearPickerOpen] = useState(false);
  const [clearYear, setClearYear] = useState(new Date().getFullYear());
  const [clearMonth, setClearMonth] = useState(new Date().getMonth() + 1);
  const [clearLoading, setClearLoading] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalMode, setDayModalMode] = useState("view");
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [calendarHistoryRows, setCalendarHistoryRows] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const loadingSteps = [
    "Connecting to admin service...",
    "Checking buses data...",
    "Checking students data...",
    "Checking drivers data...",
    "Checking feedback and leave...",
    "Preparing dashboard view...",
  ];

  useEffect(() => {
    const fetchStats = async () => {
      const res = await API.get("/admin/dashboard-stats");
      setFetchedStats(res.data);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const [tripRes, driverRes, busRes, studentRes] = await Promise.all([
          API.get("/admin/trip-list"),
          API.get("/admin/driver"),
          API.get("/admin/bus"),
          API.get("/admin/student"),
        ]);
        setCalendarTrips(tripRes.data || []);
        setCalendarDrivers(driverRes.data || []);
        setCalendarBuses(busRes.data || []);
        setCalendarStudents(studentRes.data || []);
      } catch {
        setCalendarTrips([]);
        setCalendarDrivers([]);
        setCalendarBuses([]);
        setCalendarStudents([]);
      }
    };

    fetchCalendarData();
  }, []);

  useEffect(() => {
    if (loadingDone) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) =>
        prev < loadingSteps.length - 1 ? prev + 1 : prev,
      );
    }, 700);
    return () => clearInterval(interval);
  }, [loadingDone, loadingSteps.length]);

  useEffect(() => {
    if (!fetchedStats) return;
    if (loadingStep < loadingSteps.length - 1) return;

    const timer = setTimeout(() => {
      setStats(fetchedStats);
      setLoadingDone(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchedStats, loadingStep, loadingSteps.length]);

  useEffect(() => {
    const fetchCalendarNotes = async () => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const from = formatDateKey(new Date(year, month, 1));
      const to = formatDateKey(new Date(year, month + 1, 0));

      try {
        const res = await API.get("/admin/calendar-notes", {
          params: { from, to },
        });
        setCalendarNotes(res.data || []);
      } catch {
        setCalendarNotes([]);
      }
    };

    fetchCalendarNotes();
  }, [calendarDate]);

  useEffect(() => {
    const fetchCalendarHistory = async () => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const from = formatDateKey(new Date(year, month, 1));
      const to = formatDateKey(new Date(year, month + 1, 0));

      try {
        const res = await API.get("/admin/calendar-daily-history", {
          params: { from, to },
        });
        setCalendarHistoryRows(res.data || []);
      } catch {
        setCalendarHistoryRows([]);
      }
    };

    fetchCalendarHistory();
  }, [calendarDate]);

  const studentPercent = stats?.students?.totalStudents
    ? (stats.students.assignedStudents / stats.students.totalStudents) * 100
    : 0;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDateKey = (date) => formatDateKey(date);

  const resolveDriverId = (driverField) => {
    if (!driverField) return "";
    if (typeof driverField === "string") return driverField;
    if (driverField._id) return String(driverField._id);
    return String(driverField);
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

    const endCandidate = trip.toDate
      ? new Date(trip.toDate)
      : startCandidate;

    return startCandidate <= dayEnd && endCandidate >= dayStart;
  };

  const driversById = (calendarDrivers || []).reduce((acc, d) => {
    acc[String(d._id)] = d;
    return acc;
  }, {});

  const busesByNo = (calendarBuses || []).reduce((acc, b) => {
    acc[b.busNo] = b;
    return acc;
  }, {});

  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const todayKey = getDateKey(new Date());
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  const notesByDate = (calendarNotes || []).reduce((acc, note) => {
    const key = note.dateKey;
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});
  const historyByDate = (calendarHistoryRows || []).reduce((acc, row) => {
    acc[row.dateKey] = row;
    return acc;
  }, {});
  const busesWithStudentsSet = new Set(
    (calendarStudents || [])
      .map((s) => (s.assignedBus || "").trim())
      .filter(Boolean),
  );
  const busesWithDriverSet = new Set(
    (calendarBuses || [])
      .filter((b) => (b.driverId || "").trim())
      .map((b) => b.busNo)
      .filter(Boolean),
  );
  const assignedWorkingBusSet = new Set(
    Array.from(busesWithStudentsSet).filter((busNo) => busesWithDriverSet.has(busNo)),
  );
  const assignedWorkingDriverSet = new Set(
    (calendarDrivers || [])
      .filter((d) => (d.assignedBus || "").trim())
      .map((d) => String(d._id)),
  );

  const buildLiveDaySnapshot = (date) => {
    const dayTrips = (calendarTrips || []).filter((trip) =>
      isTripOnDate(trip, date),
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
    const dayBusSet = new Set([
      ...Array.from(assignedWorkingBusSet),
      ...Array.from(specialTripBusSet),
    ]);

    const specialTripDriverSet = new Set(
      specialTripDetailsRaw
        .map((trip) => resolveDriverId(trip.driverId))
        .filter(Boolean),
    );
    const dayDriverSet = new Set([
      ...Array.from(assignedWorkingDriverSet),
      ...Array.from(specialTripDriverSet),
    ]);

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
        tripId: trip._id,
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

    return {
      dateKey: getDateKey(date),
      totalWorkingBuses: dayBusSet.size,
      totalWorkingDrivers: dayDriverSet.size,
      upcomingSpecialTrips: specialPlannedTrips.length,
      workingBusDetails,
      workingDriverDetails,
      specialTripDetails: specialTripDetailsRaw.map(mapTripDetail),
      regularTripDetails: regularTripDetailsRaw.map(mapTripDetail),
      isTodayOrPast: date <= todayStart,
      showView: date <= todayStart || specialPlannedTrips.length > 0,
    };
  };

  const todaySnapshot = buildLiveDaySnapshot(new Date());

  useEffect(() => {
    const upsertTodayHistory = async () => {
      try {
        const res = await API.post("/admin/calendar-daily-history", {
          dateKey: todaySnapshot.dateKey,
          totalWorkingBuses: todaySnapshot.totalWorkingBuses,
          totalWorkingDrivers: todaySnapshot.totalWorkingDrivers,
          upcomingSpecialTrips: todaySnapshot.upcomingSpecialTrips,
          workingBusDetails: todaySnapshot.workingBusDetails,
          workingDriverDetails: todaySnapshot.workingDriverDetails,
          specialTripDetails: todaySnapshot.specialTripDetails,
          regularTripDetails: todaySnapshot.regularTripDetails,
        });
        const row = res.data?.row;
        if (row) {
          setCalendarHistoryRows((prev) => {
            const withoutToday = prev.filter((r) => r.dateKey !== row.dateKey);
            return [...withoutToday, row];
          });
        }
      } catch {
        // ignore upsert errors in dashboard rendering
      }
    };

    if (todaySnapshot?.dateKey) {
      upsertTodayHistory();
    }
  }, [
    todaySnapshot.dateKey,
    todaySnapshot.totalWorkingBuses,
    todaySnapshot.totalWorkingDrivers,
    todaySnapshot.upcomingSpecialTrips,
    JSON.stringify(todaySnapshot.workingBusDetails),
    JSON.stringify(todaySnapshot.workingDriverDetails),
    JSON.stringify(todaySnapshot.specialTripDetails),
    JSON.stringify(todaySnapshot.regularTripDetails),
  ]);
  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const leadingEmpty = firstDay.getDay();
  const calendarCells = [];

  for (let i = 0; i < leadingEmpty; i += 1) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = getDateKey(date);
    const storedRow = historyByDate[dateKey];
    const liveRow = dateKey === todayKey ? todaySnapshot : null;
    const row = liveRow || storedRow || null;
    const isTodayOrPast = date <= todayStart;

    calendarCells.push({
      key: dateKey,
      day,
      date,
      totalWorkingBuses: row?.totalWorkingBuses || 0,
      totalWorkingDrivers: row?.totalWorkingDrivers || 0,
      workingBusDetails: row?.workingBusDetails || [],
      workingDriverDetails: row?.workingDriverDetails || [],
      upcomingSpecialTrips: row?.upcomingSpecialTrips || 0,
      specialTripDetails: row?.specialTripDetails || [],
      regularTripDetails: row?.regularTripDetails || [],
      isTodayOrPast,
      notesCount: (notesByDate[dateKey] || []).length,
      showView: Boolean(row && (isTodayOrPast || (row.upcomingSpecialTrips || 0) > 0)),
    });
  }

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  const selectedDayData =
    calendarCells.find((cell) => cell?.key === selectedDayKey) || null;
  const selectedDayNotes = notesByDate[selectedDayKey] || [];

  const openDayModal = (dateKey, mode = "view") => {
    setSelectedDayKey(dateKey);
    setDayModalMode(mode);
    setNoteTitle("");
    setNoteText("");
    setNoteError("");
    setShowDayModal(true);
  };

  const handleAddNote = async () => {
    if (!selectedDayKey) return;
    if (!noteText.trim()) {
      setNoteError("Note content is required.");
      return;
    }

    try {
      setNoteLoading(true);
      setNoteError("");
      const res = await API.post("/admin/calendar-notes", {
        dateKey: selectedDayKey,
        title: noteTitle,
        note: noteText,
      });

      if (res.data?.note) {
        setCalendarNotes((prev) => [res.data.note, ...prev]);
      }
      setNoteTitle("");
      setNoteText("");
    } catch (err) {
      setNoteError(err.response?.data?.message || "Failed to add note");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await API.delete(`/admin/calendar-notes/${noteId}`);
      setCalendarNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch {
      setNoteError("Failed to delete note");
    }
  };

  const handleClearNotesByMonth = async () => {
    const monthLabel = `${monthNames[clearMonth - 1]} ${clearYear}`;
    const ok = window.confirm(
      `This will delete calendar history for ${monthLabel}. Continue?`,
    );
    if (!ok) return;

    try {
      setClearLoading(true);
      const res = await API.delete("/admin/calendar-daily-history", {
        data: {
          year: Number(clearYear),
          month: Number(clearMonth),
        },
      });

      toast.show({
        type: "success",
        title: "Calendar History",
        message: `${res.data.deletedCount || 0} day record(s) deleted`,
      });

      const from = formatDateKey(new Date(currentYear, currentMonth, 1));
      const to = formatDateKey(new Date(currentYear, currentMonth + 1, 0));
      const refreshed = await API.get("/admin/calendar-daily-history", {
        params: { from, to },
      });
      setCalendarHistoryRows(refreshed.data || []);
      setClearPickerOpen(false);
    } catch (err) {
      toast.show({
        type: "error",
        title: "Calendar History",
        message: err.response?.data?.message || "Failed to clear history",
      });
    } finally {
      setClearLoading(false);
    }
  };

  if (!stats) {
    return (
      <div className="neo-loading-wrap">
        <div className="neo-bus-loader">
          <div className="neo-bus-icon">
            <div className="neo-bus-body" />
            <div className="neo-bus-window" />
            <div className="neo-bus-wheel neo-left" />
            <div className="neo-bus-wheel neo-right" />
          </div>
          <div className="neo-bus-track" />
        </div>

        <h4 className="neo-loading-title">Getting Information</h4>

        <div className="neo-loading-steps">
          {loadingSteps.map((step, idx) => (
            <div
              key={step}
              className={`neo-loading-step ${idx <= loadingStep ? "active" : ""}`}
            >
              <span className="neo-step-dot" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="neo-dashboard">

      <h2 className="neo-heading">Admin Overview</h2>

      {/* TOP KPI CIRCLES */}
      <Row className="mb-5">
        <Col md={4} className="text-center">
          <div className="neo-circle-wrapper">
            <div className="neo-circle-raised">
              {stats.buses.totalBuses}
            </div>
            <p>Total Buses</p>
          </div>
        </Col>

        <Col md={4} className="text-center">
          <div className="neo-circle-wrapper">
            <div
              className="neo-circle-progress"
              style={{
                background: `conic-gradient(#6c63ff ${studentPercent}%, #e0e5ec ${studentPercent}%)`
              }}
            >
              <div className="neo-circle-inner">
                {Math.round(studentPercent)}%
              </div>
            </div>
            <p>Students Assigned</p>
          </div>
        </Col>

        <Col md={4} className="text-center">
          <div className="neo-circle-wrapper">
            <div className="neo-circle-raised">
              {stats.drivers.totalDrivers}
            </div>
            <p>Total Drivers</p>
          </div>
        </Col>
      </Row>

      {/* TRIP STATUS PANEL */}
      <div className="neo-panel">

        <h5>Trip Status</h5>

        <div className="neo-row">
          <span>Running</span>
          <span>{stats.buses.runningTrips}</span>
        </div>

        <div className="neo-row">
          <span>Planned</span>
          <span>{stats.buses.plannedTrips}</span>
        </div>

        <div className="neo-row">
          <span>Completed</span>
          <span>{stats.buses.completedTrips}</span>
        </div>

      </div>

      <Row className="g-4 mt-1">
        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Students</h5>

            <div className="neo-row">
              <span>Total Students</span>
              <span>{stats.students.totalStudents}</span>
            </div>
            <div className="neo-row">
              <span>Not Bus Assigned</span>
              <span>{stats.students.unassignedStudents}</span>
            </div>

            <h6 className="neo-subheading">Department Wise</h6>
            <div className="neo-chip-wrap">
              {(stats.students.departmentWise || []).map((d) => (
                <span key={d.department} className="neo-chip">
                  {d.department || "Unknown"}: {d.count}
                </span>
              ))}
            </div>
          </div>
        </Col>

        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Drivers</h5>

            <div className="neo-row">
              <span>Total Drivers</span>
              <span>{stats.drivers.totalDrivers}</span>
            </div>
            <div className="neo-row">
              <span>Working Drivers</span>
              <span>{stats.drivers.workingDrivers}</span>
            </div>
            <div className="neo-row">
              <span>Leave Drivers</span>
              <span>{stats.drivers.leaveDrivers}</span>
            </div>
            <div className="neo-row">
              <span>Available (Not Assigned)</span>
              <span>{stats.drivers.availableDrivers}</span>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-4 mt-1">
        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Buses</h5>

            <div className="neo-row">
              <span>Total Buses</span>
              <span>{stats.buses.totalBuses}</span>
            </div>
            <div className="neo-row">
              <span>Working Buses</span>
              <span>{stats.buses.workingBuses}</span>
            </div>
            <div className="neo-row">
              <span>Fault Buses</span>
              <span>{stats.buses.faultBusesCount}</span>
            </div>

            <h6 className="neo-subheading">Fault Bus Details</h6>
            {(stats.buses.faultBusDetails || []).length === 0 ? (
              <div className="neo-muted">No fault bus details</div>
            ) : (
              <div className="neo-list">
                {stats.buses.faultBusDetails.map((b) => (
                  <div className="neo-list-item" key={b.busNo}>
                    <strong>{b.busNo}</strong> - {b.routeName || "Route N/A"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>

        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Each Bus History</h5>
            <div className="neo-list">
              {(stats.buses.busHistory || []).map((b) => (
                <div className="neo-list-item" key={b.busNo}>
                  <strong>{b.busNo}</strong> | Trips: {b.totalTrips} | Running: {b.runningTripCount} | Completed: {b.completedTripCount}
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-4 mt-1">
        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Special Trip Details</h5>

            <div className="neo-row">
              <span>Total</span>
              <span>{stats.specialTrips.total}</span>
            </div>
            <div className="neo-row">
              <span>Planned</span>
              <span>{stats.specialTrips.planned}</span>
            </div>
            <div className="neo-row">
              <span>Running</span>
              <span>{stats.specialTrips.running}</span>
            </div>
            <div className="neo-row">
              <span>Completed</span>
              <span>{stats.specialTrips.completed}</span>
            </div>
          </div>
        </Col>

        <Col lg={6}>
          <div className="neo-panel h-100">
            <h5>Feedback & Leave Requests</h5>

            <div className="neo-row">
              <span>Feedbacks (Total)</span>
              <span>{stats.feedback.totalFeedback}</span>
            </div>
            <div className="neo-row">
              <span>Feedbacks (Pending)</span>
              <span>{stats.feedback.pendingFeedback}</span>
            </div>
            <div className="neo-row">
              <span>Leave Requests (Total)</span>
              <span>{stats.leave.totalLeaveRequests}</span>
            </div>
            <div className="neo-row">
              <span>Leave Requests (Pending)</span>
              <span>{stats.leave.pendingLeaveRequests}</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* FEEDBACK PANEL */}
      <div className="neo-panel mt-4">

        <h5>Feedback Overview</h5>

        <div className="neo-row">
          <span>Pending</span>
          <span>{stats.feedback.pendingFeedback}</span>
        </div>

        <div className="neo-row">
          <span>Reviewed</span>
          <span>{stats.feedback.reviewedFeedback}</span>
        </div>

      </div>

      <div className="neo-panel mt-4">
        <div className="neo-calendar-header">
          <h5 className="mb-0">Trips Calendar</h5>
          <div className="neo-calendar-controls">
            <Form.Select
              className="neo-calendar-select"
              value={currentMonth}
              onChange={(e) =>
                setCalendarDate(new Date(currentYear, Number(e.target.value), 1))
              }
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              className="neo-calendar-select"
              value={currentYear}
              onChange={(e) =>
                setCalendarDate(new Date(Number(e.target.value), currentMonth, 1))
              }
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
        {clearPickerOpen && (
          <div className="neo-clear-row mb-3">
            <Form.Select
              className="neo-calendar-select"
              value={clearMonth}
              onChange={(e) => setClearMonth(Number(e.target.value))}
            >
              {monthNames.map((m, idx) => (
                <option key={`clear-${m}`} value={idx + 1}>
                  {m}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              className="neo-calendar-select"
              value={clearYear}
              onChange={(e) => setClearYear(Number(e.target.value))}
            >
              {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (
                <option key={`clear-y-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </Form.Select>
            <Button
              size="sm"
              className="neo-note-delete-btn"
              onClick={handleClearNotesByMonth}
              disabled={clearLoading}
            >
              {clearLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )}

        <div className="neo-calendar-grid neo-calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="neo-weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="neo-calendar-grid">
          {calendarCells.map((cell, idx) =>
            cell ? (
              <div
                key={cell.key}
                className={`neo-day-card ${cell.key === todayKey ? "today" : ""}`}
              >
                <div className="neo-day-top">
                  <span className="neo-day-number">{cell.day}</span>
                  {cell.notesCount > 0 && (
                    <span className="neo-note-count">
                      {cell.notesCount} {cell.notesCount === 1 ? "note" : "notes"}
                    </span>
                  )}
                </div>

                <div className="neo-day-metrics">
                  {cell.isTodayOrPast ? (
                    <>
                      {cell.totalWorkingBuses > 0 && (
                        <div>Working Buses: {cell.totalWorkingBuses}</div>
                      )}
                      {cell.totalWorkingDrivers > 0 && (
                        <div>
                        Drivers Working: {cell.totalWorkingDrivers}</div>
                      )}
                      {cell.upcomingSpecialTrips > 0 && (
                        <div>Special Trips: {cell.upcomingSpecialTrips}</div>
                      )}
                      {cell.totalWorkingBuses === 0 &&
                        cell.totalWorkingDrivers === 0 &&
                        cell.upcomingSpecialTrips === 0 && <div></div>}
                    </>
                  ) : cell.upcomingSpecialTrips > 0 ? (
                    <div>Special Trip Planned: {cell.upcomingSpecialTrips}</div>
                  ) : (
                    <div></div>
                  )}
                </div>

                <div className="neo-day-actions">
                  {cell.showView && (
                    <Button
                      size="sm"
                      className="neo-calendar-view-btn neo-icon-btn"
                      title="View Day Details"
                      aria-label="View Day Details"
                      onClick={() => openDayModal(cell.key, "view")}
                    >
                      <FaEye />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="neo-calendar-note-btn neo-icon-btn"
                    title="Add Note"
                    aria-label="Add Note"
                    onClick={() => openDayModal(cell.key, "notes")}
                  >
                    <FaRegStickyNote />
                  </Button>
                </div>
              </div>
            ) : (
              <div key={`empty-${idx}`} className="neo-day-empty" />
            ),
          )}
        </div>

        <div className="neo-clear-footer mt-3">
          <Button
            size="sm"
            className="neo-calendar-note-btn"
            onClick={() => setClearPickerOpen((prev) => !prev)}
          >
            Clear
          </Button>
        </div>
      </div>

      <Modal
        show={showDayModal}
        onHide={() => setShowDayModal(false)}
        size="lg"
        centered
        dialogClassName="glass-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {dayModalMode === "notes" ? "Notes" : "Day Details"}{" "}
            {selectedDayData ? `- ${selectedDayData.date.toLocaleDateString()}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedDayData ? (
            <div className="neo-muted">No data available.</div>
          ) : dayModalMode === "view" ? (
            <>
              <div className="neo-day-summary">
                <div className="neo-row">
                  <span>Working Buses</span>
                  <strong>{selectedDayData.totalWorkingBuses}</strong>
                </div>
                <div className="neo-row">
                  <span>Drivers Working</span>
                  <strong>{selectedDayData.totalWorkingDrivers}</strong>
                </div>
                <div className="neo-row">
                  <span>Special Trips (Planned)</span>
                  <strong>{selectedDayData.upcomingSpecialTrips}</strong>
                </div>
              </div>

              <div className="neo-day-notes mt-3">
                <h6 className="mb-2">Working Buses</h6>
                {(selectedDayData.workingBusDetails || []).length === 0 ? (
                  <div className="neo-muted">No working bus details.</div>
                ) : (
                  <div className="neo-list">
                    {selectedDayData.workingBusDetails.map((b) => (
                      <div key={b.busNo} className="neo-list-item">
                        <div><strong>{b.busNo}</strong></div>
                        <div>Route: {b.routeName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="neo-day-notes mt-3">
                <h6 className="mb-2">Working Drivers</h6>
                {(selectedDayData.workingDriverDetails || []).length === 0 ? (
                  <div className="neo-muted">No working driver details.</div>
                ) : (
                  <div className="neo-list">
                    {selectedDayData.workingDriverDetails.map((d) => (
                      <div key={d.id} className="neo-list-item">
                        <div><strong>{d.name}</strong> ({d.driverId})</div>
                        <div>Phone: {d.phone}</div>
                        <div>Assigned Bus: {d.assignedBus}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="neo-day-notes mt-3">
                <h6 className="mb-2">Special Trips (Planned / Completed)</h6>
                {(selectedDayData.specialTripDetails || []).length === 0 ? (
                  <div className="neo-muted">No special trip details.</div>
                ) : (
                  <div className="neo-list">
                    {selectedDayData.specialTripDetails.map((trip) => {
                      return (
                        <div key={trip.tripId || `${trip.busNo}-${trip.startTime}`} className="neo-list-item">
                          <div className="neo-trip-title">
                            <strong>{trip.busNo || "N/A"}</strong>
                            <Badge bg={trip.status === "completed" ? "success" : "warning"}>
                              {trip.status || "planned"}
                            </Badge>
                          </div>
                          <div>Driver: {trip.driverName || "N/A"} ({trip.driverCode || "No Driver ID"})</div>
                          <div>Driver Phone: {trip.driverPhone || "-"}</div>
                          <div>Trip Time: {trip.startTime || "-"} to {trip.endTime || "-"}</div>
                          <div>Trip Date: {trip.fromDate ? new Date(trip.fromDate).toLocaleDateString() : "-"} to {trip.toDate ? new Date(trip.toDate).toLocaleDateString() : "-"}</div>
                          <div>Destination: {trip.destination || "-"}</div>
                          <div>Reason: {trip.reason || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {(() => {
                const regularTrips = selectedDayData.regularTripDetails || [];
                if (regularTrips.length === 0) {
                  return <div className="neo-muted mt-3">No regular trip details for this day.</div>;
                }
                return (
                  <div className="neo-list mt-3">
                    {regularTrips.map((trip) => {
                    return (
                      <div key={trip.tripId || `${trip.busNo}-${trip.startTime}`} className="neo-list-item">
                        <div className="neo-trip-title">
                          <strong>{trip.busNo || "N/A"}</strong>
                          <div className="d-flex gap-2 flex-wrap">
                            <Badge bg="secondary">{trip.status || "planned"}</Badge>
                          </div>
                        </div>
                        <div>Bus: {trip.busNo || "N/A"} - {trip.routeName || "Route N/A"}</div>
                        <div>Driver: {trip.driverName || "N/A"} ({trip.driverCode || "No Driver ID"})</div>
                        <div>Driver Phone: {trip.driverPhone || "-"}</div>
                        <div>Trip Time: {trip.startTime || "-"} to {trip.endTime || "-"}</div>
                        <div>Trip Date: {trip.fromDate ? new Date(trip.fromDate).toLocaleDateString() : "-"} to {trip.toDate ? new Date(trip.toDate).toLocaleDateString() : "-"}</div>
                        <div>Destination: {trip.destination || "-"}</div>
                        <div>Reason: {trip.reason || "-"}</div>
                      </div>
                    );
                    })}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="neo-day-notes">
              <h6 className="mb-2">Work Notes</h6>
              {selectedDayNotes.length === 0 ? (
                <div className="neo-muted mb-2">No notes added for this day.</div>
              ) : (
                <div className="neo-list mb-3">
                  {selectedDayNotes.map((n) => (
                    <div key={n._id} className="neo-list-item">
                      <div className="neo-note-item-head">
                        <strong>{n.title || "Untitled Note"}</strong>
                        <Button
                          size="sm"
                          className="neo-note-delete-btn neo-icon-btn"
                          title="Delete Note"
                          aria-label="Delete Note"
                          onClick={() => handleDeleteNote(n._id)}
                        >
                          <FaTrashAlt />
                        </Button>
                      </div>
                      <div>{n.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <Form.Group className="mb-2">
                <Form.Label>Note Title (Optional)</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Enter title"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  className="input-soft"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add work update..."
                />
              </Form.Group>
              {noteError && <div className="text-danger mb-2">{noteError}</div>}
              <Button
                className="neo-calendar-view-btn"
                onClick={handleAddNote}
                disabled={noteLoading}
              >
                {noteLoading ? "Saving..." : "Save Note"}
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
}
