import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { Container, Row, Col, Card, Modal, Form, Button } from "react-bootstrap";
import API from "../../api";
import { toast } from "../../utils/toast";

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [stopDetails, setStopDetails] = useState(null);
  const [time, setTime] = useState(new Date());
  const [sessionMode, setSessionMode] = useState("auto"); // auto | morning | evening
  const [announcement,setAnnouncement] = useState([]);
  const [showStudentNotifications, setShowStudentNotifications] = useState(false);
  const [studentNotifications, setStudentNotifications] = useState([]);
  const [studentReadIds, setStudentReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studentReadNotifications")) || [];
    } catch {
      return [];
    }
  });
  const [studentClearedAt, setStudentClearedAt] = useState(() => {
    const stored = localStorage.getItem("studentNotificationsClearedAt");
    return stored ? Number(stored) : 0;
  });
  const [feedBackModel, setFeedBackModel] = useState(false);
  const feedBackModelClose = () => setFeedBackModel(false);
  const feedBackModelShow = () => setFeedBackModel(true);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(3);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [routes, setRoutes] = useState([]);
const [selectedRoute, setSelectedRoute] = useState("");
const [selectedStop, setSelectedStop] = useState("");

  const [stopLoading, setStopLoading] = useState(false);

  useEffect(() => {
  if (student && !student.busStop) {
    setShowModal(true);
  }
}, [student]);

const handleStopSubmit = async () => {
  if (!selectedRoute || !selectedStop) return;

  try {
    setStopLoading(true);

    await API.post("/student/select-stop", {
      busNo: selectedRoute,
      busStop: selectedStop
    });

    // Refresh profile immediately
    const res = await API.get("/student/profile");

    setStudent(res.data.student);
    setDriver(res.data.driver);
    setBus(res.data.bus);
    setStopDetails(res.data.stopDetails);

    setShowModal(false);

  } catch (err) {
    toast.show({
      type: "error",
      title: "Assign Stop",
      message: err.response?.data?.message || "Error assigning stop",
    });
  }

  setStopLoading(false);
};

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoadingFeedback(true);
      await API.post("/student/feedback", {
        busNo: student?.assignedBus || bus?.busNo,
        rating,
        category: category.toLowerCase(),
        message,
      });

      toast.show({
        type: "success",
        title: "Feedback",
        message: "Feedback submitted successfully",
      });

      setCategory("general");
      setMessage("");
      setRating(3);
      setFeedBackModel(false);
    } catch (err) {
      toast.show({
        type: "error",
        title: "Feedback",
        message: err.response?.data?.message || "Failed to submit feedback",
      });
    } finally {
      setLoadingFeedback(false);
    }
  };


useEffect(() => {
  if (showModal) {
    fetchRoutes();
  }
}, [showModal]);

const fetchRoutes = async () => {
  try {
    const res = await API.get("/student/routes");
    setRoutes(res.data);
  } catch (err) {
    console.error(err);
  }
};
const selectedBus = routes.find(
  (route) => route.busNo === selectedRoute
);

const stops = selectedBus ? selectedBus.stops : [];










  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/student/profile");
        setStudent(res.data.student || null);
        setDriver(res.data.driver || null);
        setBus(res.data.bus || null);
        setStopDetails(res.data.stopDetails || null);
      } catch (err) {
        console.error("Error fetching student data:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const announcementData = async () => {
      try{
        const res = await API.get("/student/announcement");
        setAnnouncement(res.data || []);
      }catch (err)
      {
        console.error("Error fetching Announcement DATA :", err);
      }
    };
    announcementData();
  }, []);

  const buildStudentNotifications = () => {
    const items = [];

    (announcement || []).forEach((a) => {
      const id = `announcement-${a._id || a.title}`;
      items.push({
        id,
        type: "announcement",
        title: a.title || "Announcement",
        message: a.message || "",
        time: a.createdAt || Date.now(),
      });
    });

    if (student?.assignedBus !== undefined) {
      const prevBus = localStorage.getItem("studentAssignedBus");
      if (prevBus !== student.assignedBus) {
        if (prevBus !== null) {
          items.push({
            id: `bus-change-${student.assignedBus || "none"}`,
            type: "bus",
            title: "Assigned Bus Updated",
            message: student.assignedBus
              ? `You are now assigned to bus ${student.assignedBus}`
              : "You are no longer assigned to a bus",
            time: Date.now(),
          });
        }
        localStorage.setItem("studentAssignedBus", student.assignedBus || "");
      }
    }

    const filtered = items.filter((i) => new Date(i.time).getTime() > studentClearedAt);
    filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
    setStudentNotifications(filtered);
  };

  useEffect(() => {
    buildStudentNotifications();
  }, [announcement, student?.assignedBus, studentClearedAt]);

  const studentUnreadCount = studentNotifications.filter(
    (n) => !studentReadIds.includes(n.id)
  ).length;

  const markAllStudentRead = () => {
    const allIds = studentNotifications.map((n) => n.id);
    setStudentReadIds(allIds);
    localStorage.setItem("studentReadNotifications", JSON.stringify(allIds));
  };

  const clearStudentNotifications = () => {
    const ts = Date.now();
    setStudentNotifications([]);
    setStudentReadIds([]);
    setStudentClearedAt(ts);
    localStorage.setItem("studentNotificationsClearedAt", String(ts));
    localStorage.removeItem("studentReadNotifications");
  };
 
  /* ================= LIVE CLOCK ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow || "auto";
    };
  }, []);

  /* ================= TIME CALCULATION ================= */

  const currentHours = time.getHours();
  const currentMinutes = time.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;

const convertToMinutes = (timeValue) => {
  if (!timeValue) return null;

  if (typeof timeValue === "number") return timeValue;

  if (typeof timeValue === "string") {
    const time = timeValue.trim();

    // Handle 12-hour format with AM/PM
    const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();

      if (period === "PM" && hours !== 12) {
        hours += 12;
      }

      if (period === "AM" && hours === 12) {
        hours = 0;
      }

      return hours * 60 + minutes;
    }

    // Handle 24-hour format
    const parts = time.split(":");
    if (parts.length === 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);

      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }
  }

  return null;
};



const getAutoSession = () => {
  const morningStart = convertToMinutes(bus?.tripStartMorning);
  const morningEnd = convertToMinutes(bus?.tripEndMorning);
  const eveningStart = convertToMinutes(bus?.tripStartEvening);
  const eveningEnd = convertToMinutes(bus?.tripEndEvening);

  if (morningStart !== null && morningEnd !== null) {
    if (currentTime >= morningStart && currentTime <= morningEnd) return "morning";
    if (currentTime < morningStart) return "morning";
  }

  if (eveningStart !== null && eveningEnd !== null) {
    if (currentTime >= eveningStart && currentTime <= eveningEnd) return "evening";
    if (currentTime < eveningStart) return "evening";
  }

  return "morning";
};

const activeSession = sessionMode === "auto" ? getAutoSession() : sessionMode;

let busStartTime = null;
let busEndTime = null;
let studentStopTime = null;

if (bus && stopDetails) {
  if (activeSession === "morning") {
    busStartTime = convertToMinutes(bus.tripStartMorning);
    busEndTime = convertToMinutes(bus.tripEndMorning);
    studentStopTime = stopDetails.morningTime;
  } else {
    busStartTime = convertToMinutes(bus.tripStartEvening);
    busEndTime = convertToMinutes(bus.tripEndEvening);
    studentStopTime = stopDetails.eveningTime;
  }
}


  const stopTimeInMinutes = convertToMinutes(studentStopTime);

  let timeDifference = null;

if (stopTimeInMinutes !== null) {
  timeDifference = stopTimeInMinutes - currentTime;
}


 const track =
  busStartTime !== null &&
  busEndTime !== null &&
  currentTime >= busStartTime &&
  currentTime <= busEndTime;


  // Build stop list with correct time
  const stopsWithTime = bus?.stops?.map((stop) => {
    const stopTime = activeSession === "morning" ? stop.morningTime : stop.eveningTime;

    return {
      name: stop.stopName,
      time: stopTime,
      minutes: convertToMinutes(stopTime),
    };
  });

  const orderedStops =
    activeSession === "morning"
      ? [...(stopsWithTime || [])].reverse()
      : stopsWithTime;

  // Find current stop index
  let currentStopIndex = -1;

  if (orderedStops) {
    for (let i = 0; i < orderedStops.length; i++) {
      if (currentTime >= orderedStops[i].minutes) {
        currentStopIndex = i;
      }
    }
  }

  /* ================= SAFE DEBUG ================= */

  if (student) {
    console.log("Student Stop:", student.busStop);
  }

  if (bus) {
    console.log("Bus Stops:", bus.stops);
  }

  /* ================= UI ================= */


console.log("Current:", currentTime);
console.log("Bus Start:", stopDetails?.morningTime);
console.log("Bus End:", busEndTime);
console.log("Track:", track);



  return (
    <div className="student-dashboard ">
      

      <Header />
      <button className="feedback-btn-student" onClick={feedBackModelShow} aria-label="Feedback">
        <i className="bi bi-chat-quote"></i>
      </button>

      <Container className="mt-4 p-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h3 className="student-name mb-0">Welcome,<span style={{fontSize:35,color:"orange", fontFamily:"cursive"}} > {student?.name} </span></h3>
          <div className="d-flex align-items-center gap-2">
            <span className="info-chip">
              {new Date().toLocaleDateString()} • {time.toLocaleTimeString()}
            </span>
            <button
              className="student-notify-btn"
              onClick={() => setShowStudentNotifications(true)}
              aria-label="Notifications"
              type="button"
            >
              <i className="bi bi-bell"></i>
              {studentUnreadCount > 0 && (
                <span className="student-notify-badge">{studentUnreadCount}</span>
              )}
            </button>
          </div>
        </div>

        <Row>
          <Col md={6}>
            <Card className="mt-4 p-3 neo-card">
              <Card.Body>
                <h5 className="section-title">Student Details</h5>
                <hr className="divider-soft" />
                <p>
                  <strong>Name:</strong> {student?.name}
                </p>
                <p>
                  <strong>Roll Number:</strong> {student?.rollNumber}
                </p>
                <p>
                  <strong>Department:</strong> {student?.department}
                </p>
                <p>
                  <strong>Year:</strong> {student?.year} year
                </p>
                <p>
                  <strong>Contact:</strong> {student?.phone}
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mt-4 p-3 neo-card">
              <Card.Body>
                <h5 className="section-title">Bus Details</h5>
                <hr className="divider-soft" />
                <p>
                  <strong>Assigned Bus:</strong> {student?.assignedBus}
                </p>
                <p>
                  <strong>Bus Stop:</strong> {student?.busStop}
                </p>
                <p>
                  <strong>Timing:</strong> {studentStopTime}{" "}
                  {activeSession === "morning" ? "AM" : "PM"}
                </p>
                <p>
                  <strong>Driver:</strong> {driver?.name || "Not Assigned"}
                </p>
                <p>
                  <strong>Contact:</strong> {driver?.phone || "-"}
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="mt-4 p-3 neo-card">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 className="section-title mb-0">Where is my Bus</h5>
              <Form.Select
                className="neo-input"
                style={{ maxWidth: 180 }}
                value={sessionMode}
                onChange={(e) => setSessionMode(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </Form.Select>
            </div>
            <hr className="divider-soft" />

            <p>
              {track && timeDifference > 0 &&
                `Bus arriving in ${timeDifference} minutes`}
              {track && timeDifference === 0 && "Bus arriving now"}
              {track && timeDifference < 0 &&
                `Bus passed ${Math.abs(timeDifference)} minutes ago`}
              {!track && "After the bus starts the journey, the ETA will be shown here."}
            </p>

            {orderedStops?.length > 0 && (
              <div className="mt-4 rail-soft">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      {orderedStops.map((stop, index) => {
                        const isDone = index < currentStopIndex;
                        const isCurrent = index === currentStopIndex;

                        return (
                          <div
                            key={index}
                            style={{
                              flex: 1,
                              textAlign: "center",
                              position: "relative",
                            }}
                          >
                            {index !== stopsWithTime.length - 1 && (
                              <div
                                className={`student-track-line ${isDone ? "is-done" : ""}`}
                              />
                            )}

                            <div
                              className={`student-track-dot ${
                                isCurrent ? "is-current" : isDone ? "is-done" : ""
                              }`}
                            />

                            <div style={{ marginTop: 8 }}>
                              <small>
                                <strong>{stop.name}</strong>
                              </small>
                              <br />
                              <small>{stop.time}</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-center mt-3">
                      {currentStopIndex === -1 && "Bus not started yet"}
                      {currentStopIndex >= 0 &&
                        currentStopIndex < orderedStops.length - 1 &&
                        `Bus reached ${orderedStops[currentStopIndex].name}`}
                      {currentStopIndex === orderedStops.length - 1 &&
                        "Bus reached final destination"}
                    </div>
                  </div>
                )}
          </Card.Body>
        </Card>

        <Card className="mt-4 p-3 neo-card">
          <Card.Body>
            <h5 className="section-title">Announcements</h5>
            <hr className="divider-soft" />
            {announcement.length === 0 ? (
      <p className="neo-soft p-3 mb-0">No announcements available</p>
    ) : (
      announcement.map((item, index) => (
        <div key={index} className="mb-3 neo-soft p-3">
          <h6 className="mb-2">{item.title}</h6>
          <p>{item.message}</p>
          <small className="text-muted">
            {new Date(item.createdAt).toLocaleString()}
          </small>
        </div>
      ))
    )}
          </Card.Body>
        </Card>
      </Container>

<Modal show={showModal} backdrop="static" centered dialogClassName="glass-modal">
  <Modal.Header>
    <Modal.Title>Select Your Route & Stop</Modal.Title>
  </Modal.Header>

  <Modal.Body>
    <Form>

      {/* Route Dropdown */}
      <Form.Select
        className="mb-3 neo-input"
        value={selectedRoute}
        onChange={(e) => {
          setSelectedRoute(e.target.value);
          setSelectedStop("");
        }}
      >
        <option value="">Select Route</option>
        {routes.map((route) => (
          <option key={route.busNo} value={route.busNo}>
            {route.routeName} ({route.availableSeats} seats left)
          </option>
        ))}
      </Form.Select>

      {/* Stop Dropdown */}
      {selectedRoute && (
        <Form.Select
          className="neo-input"
          value={selectedStop}
          onChange={(e) => setSelectedStop(e.target.value)}
        >
          <option value="">Select Stop</option>
          {stops.map((stop, index) => (
            <option key={index} value={stop.stopName}>
              {stop.stopName}
            </option>
          ))}
        </Form.Select>
      )}

    </Form>
  </Modal.Body>

  <Modal.Footer>
    <Button
      variant="primary"
      className="primary-neo"
      disabled={!selectedRoute || !selectedStop || stopLoading}
      onClick={handleStopSubmit}
    >
      {stopLoading ? "Assigning..." : "Confirm Selection"}
    </Button>
  </Modal.Footer>
</Modal>

      {showStudentNotifications && (
        <>
          <div
            className="student-notify-overlay"
            onClick={() => setShowStudentNotifications(false)}
          />
          <div className="student-notify-panel">
            <div className="student-notify-header">
              <div>
                <h6 className="mb-0">Notifications</h6>
                <small className="text-muted">
                  {studentUnreadCount} unread
                </small>
              </div>
              <button
                className="student-notify-close"
                onClick={() => setShowStudentNotifications(false)}
              >
                ×
              </button>
            </div>

            <div className="student-notify-actions">
              <button className="student-notify-mark" onClick={markAllStudentRead}>
                Mark all as read
              </button>
              <button className="student-notify-clear" onClick={clearStudentNotifications}>
                Clear all
              </button>
            </div>

            <div className="student-notify-list">
              {studentNotifications.length === 0 && (
                <div className="student-notify-empty">No notifications</div>
              )}
              {studentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`student-notify-item ${studentReadIds.includes(n.id) ? "read" : "unread"}`}
                >
                  <div className="student-notify-dot" />
                  <div className="student-notify-content">
                    <div className="student-notify-title">{n.title}</div>
                    <div className="student-notify-message">{n.message}</div>
                    <div className="student-notify-time">
                      {new Date(n.time).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* =====================feedback modal============= */}
      <Modal show={feedBackModel} onHide={feedBackModelClose} centered dialogClassName="student-feedback-modal">
        <Modal.Header closeButton className="student-feedback">
          <Modal.Title>Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body className="student-feedback-body">
          <Form onSubmit={handleFeedbackSubmit} >
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">General</option>
                <option value="bus">Bus</option>
                <option value="driver">Driver</option>
                <option value="route">Route</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rating</Form.Label>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    style={{
                      fontSize: "22px",
                      cursor: "pointer",
                      color: star <= rating ? "#f5b301" : "#ccc",
                    }}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your feedback..."
                required
              />
            </Form.Group>

            <Button
              type="submit"
              className="primary-neo w-100"
              disabled={loadingFeedback}
            >
              {loadingFeedback ? "Submitting..." : "Submit"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>


    </div>
  );
}

export default StudentDashboard;
