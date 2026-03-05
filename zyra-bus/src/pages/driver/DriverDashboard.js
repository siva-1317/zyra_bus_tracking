import React, { useEffect } from "react";
import Header from "../../components/Header";
import {
  Badge,
  Card,
  CardBody,
  Col,
  Form,
  Row,
  Button,
  Tabs,
  Tab,
  Table,
  Modal,
} from "react-bootstrap";
import { useState } from "react";
import API from "../../api";
import DriverTrackingPage from "./DriverTrackingPage";
import { toast } from "../../utils/toast";

function DriverDashboard() {
  const [key, setKey] = useState("details");

  // Leave details model

  const [modelShow, setModelShow] = useState(false);
  const ModelClose = () => setModelShow(false);
  const ModelShow = () => setModelShow(true);

  const [feedBackModel, setFeedBackModel] = useState(false);
  const feedBackModelClose = () => setFeedBackModel(false);
  const feedBackModelShow = () => setFeedBackModel(true);
  const [complaintModal, setComplaintModal] = useState(false);
  const complaintModalClose = () => setComplaintModal(false);
  const complaintModalShow = () => setComplaintModal(true);

  const [show, setShow] = useState(false);

  const currentIndex = 4;

  const busData = {
    stops: [
      { name: "New Delhi", time: "12:03 AM" },
      { name: "Ghaziabad", time: "02:13 AM" },
      { name: "Moradabad", time: "03:33 AM" },
      { name: "Bareilly", time: "04:42 AM" },
      { name: "Lucknow", time: "07:25 AM" },
    ],
  };
  const totalStops = busData.stops.length;
  const progress = (currentIndex / (totalStops - 1)) * 100;

  // ====================================Backend========================================================================

  const [driver, setDriver] = useState(null);
  const [bus, setBus] = useState(null);
  const [announcement, setAnnouncement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTrip, setActiveTrip] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("driverReadNotifications")) || [];
    } catch {
      return [];
    }
  });
  const [clearedAt, setClearedAt] = useState(() => {
    const stored = localStorage.getItem("driverNotificationsClearedAt");
    return stored ? Number(stored) : 0;
  });

  useEffect(() => {
    const fetchDriver = async () => {
      const start = Date.now();
      try {
        const res = await API.get("/driver/profile");
        setDriver(res.data.driver || null);
        setBus(res.data.bus || null);
      } catch (err) {
        console.error("driver data fetching error", err);
      } finally {
        const elapsed = Date.now() - start;
        const minDuration = 2200;
        const remaining = Math.max(minDuration - elapsed, 0);
        setTimeout(() => setLoading(false), remaining);
      }
    };
    fetchDriver();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const steps = [
      "Connecting to API...",
      "API connected",
      "DB connected",
      "Fetching driver data...",
      "Preparing dashboard...",
    ];
    setLoadingStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        clearInterval(interval);
        return;
      }
      setLoadingStep(i);
    }, 450);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await API.get("/driver/announcement");
        setAnnouncement(res.data || null);
      } catch (err) {
        console.error("fetching announcement error: ", err);
      }
    };
    fetchAnnouncement();
  }, []);

  useEffect(() => {
    const fetchActiveTrip = async () => {
      try {
        const res = await API.get("/driver/active-trip");
        setActiveTrip(res.data?.trip || null);
      } catch (err) {
        console.error("fetching active trip error:", err);
      }
    };
    fetchActiveTrip();
  }, []);

  // console.log("driver name:",driver?.name);
  // console.log("bus name:",bus?.busNo);

  const dutyAssign =
    driver?.assignedBus !== null && driver?.assignedBus !== "undefined";

  // console.log(dutyAssign);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [reason, setReason] = useState("");

  const [loadingLeave, setLoadingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoadingLeave(true);
      setLeaveMessage("");

      const res = await API.post("/driver/leave", {
        fromDate,
        toDate,
        fromTime,
        toTime,
        reason,
      });

      const successMessage = res.data.message || "Leave request submitted";
      setLeaveMessage(successMessage);
      toast.show({
        type: "success",
        title: "Leave Request",
        message: successMessage,
      });
      // Reset form
      setFromDate("");
      setToDate("");
      setFromTime("");
      setToTime("");
      setReason("");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to apply leave";
      setLeaveMessage(errorMessage);
      toast.show({
        type: "error",
        title: "Leave Request",
        message: errorMessage,
      });
    } finally {
      setLoadingLeave(false);
    }
  };

  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showCancelLeaveConfirm, setShowCancelLeaveConfirm] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [cancelLeaveLoading, setCancelLeaveLoading] = useState(false);
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await API.get("/driver/leave");
        setLeaves(res.data || []);
      } catch (err) {
        console.error("Error fetching leaves", err);
      }
    };

    fetchLeaves();
  }, []);

  const buildNotifications = () => {
    const items = [];

    // Announcements
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

    // Special trip
    if (activeTrip && activeTrip.tripType === "event" && activeTrip.status === "planned") {
      items.push({
        id: `special-${activeTrip._id}`,
        type: "special",
        title: "Special Trip Assigned",
        message: `${activeTrip.destination || "Destination"} • ${activeTrip.reason || "Event"}`,
        time: activeTrip.createdAt || Date.now(),
      });
    }

    // Assigned bus change
    if (driver?.assignedBus !== undefined) {
      const prevBus = localStorage.getItem("driverAssignedBus");
      if (prevBus !== driver.assignedBus) {
        if (prevBus !== null) {
          items.push({
            id: `bus-change-${driver.assignedBus || "none"}`,
            type: "bus",
            title: "Assigned Bus Updated",
            message: driver.assignedBus
              ? `You are now assigned to bus ${driver.assignedBus}`
              : "You are no longer assigned to a bus",
            time: Date.now(),
          });
        }
        localStorage.setItem("driverAssignedBus", driver.assignedBus || "");
      }
    }

    // Leave status updates
    const lastLeaveStatus =
      JSON.parse(localStorage.getItem("driverLeaveStatus") || "{}");
    (leaves || []).forEach((l) => {
      if (!l._id) return;
      if (l.status && l.status !== "waiting") {
        const lastStatus = lastLeaveStatus[l._id];
        if (lastStatus !== l.status) {
          items.push({
            id: `leave-${l._id}-${l.status}`,
            type: "leave",
            title: "Leave Status Updated",
            message: `Your leave is ${l.status}`,
            time: l.updatedAt || l.createdAt || Date.now(),
          });
          lastLeaveStatus[l._id] = l.status;
        }
      }
    });
    localStorage.setItem("driverLeaveStatus", JSON.stringify(lastLeaveStatus));

    const filtered = items.filter((i) => new Date(i.time).getTime() > clearedAt);
    filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
    setNotifications(filtered);
  };

  useEffect(() => {
    buildNotifications();
  }, [announcement, activeTrip, driver?.assignedBus, leaves]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("driverReadNotifications", JSON.stringify(allIds));
  };

  const clearNotifications = () => {
    const ts = Date.now();
    setNotifications([]);
    setReadIds([]);
    setClearedAt(ts);
    localStorage.setItem("driverNotificationsClearedAt", String(ts));
    localStorage.removeItem("driverReadNotifications");
  };

  const handleDeleteLeave = async (id) => {
    setLeaveToCancel(id);
    setShowCancelLeaveConfirm(true);
  };

  const closeCancelLeaveConfirm = () => {
    if (cancelLeaveLoading) return;
    setShowCancelLeaveConfirm(false);
    setLeaveToCancel(null);
  };

  const confirmDeleteLeave = async () => {
    if (!leaveToCancel) return;
    try {
      setCancelLeaveLoading(true);
      await API.delete(`/driver/leave/${leaveToCancel}`);
      setLeaves((prevLeaves) =>
        prevLeaves.filter((leave) => leave._id !== leaveToCancel),
      );
      toast.show({
        type: "success",
        title: "Leave Cancelled",
        message: "Leave request cancelled successfully",
      });
      setShowCancelLeaveConfirm(false);
      setLeaveToCancel(null);
    } catch (err) {
      toast.show({
        type: "error",
        title: "Delete Leave",
        message: err.response?.data?.message || "Failed to delete leave",
      });
    } finally {
      setCancelLeaveLoading(false);
    }
  };

  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(3);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [complaintType, setComplaintType] = useState("puncture");
  const [complaintText, setComplaintText] = useState("");
  const [complaintPhotos, setComplaintPhotos] = useState([]);
  const [complaintLoading, setComplaintLoading] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoadingFeedback(true);

      await API.post("/driver/feedback", {
        busNo: bus?.busNo,
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

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();

    try {
      setComplaintLoading(true);
      const formData = new FormData();
      formData.append("complaintType", complaintType);
      formData.append("description", complaintText);
      Array.from(complaintPhotos || []).forEach((file) =>
        formData.append("photos", file),
      );

      await API.post("/driver/bus-complaint", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.show({
        type: "success",
        title: "Bus Complaint",
        message: "Complaint submitted. Admin will review and assign alternate bus.",
      });

      setComplaintType("puncture");
      setComplaintText("");
      setComplaintPhotos([]);
      complaintModalClose();
    } catch (err) {
      toast.show({
        type: "error",
        title: "Bus Complaint",
        message: err.response?.data?.message || "Failed to submit complaint",
      });
    } finally {
      setComplaintLoading(false);
    }
  };

  // ===========================================frontend===================================================================

  return (
    loading ? (
      <div className="driver-loading">
        <div className="bus-loader">
          <div className="bus-icon">
            <div className="bus-body" />
            <div className="bus-window" />
            <div className="bus-wheel left" />
            <div className="bus-wheel right" />
          </div>
          <div className="bus-track" />
        </div>
        <div className="loading-steps">
          {[
            "Connecting to API...",
            "API connected",
            "DB connected",
            "Fetching driver data...",
            "Preparing dashboard...",
          ].map((step, idx) => (
            <div
              key={step}
              className={`loading-step ${idx <= loadingStep ? "active" : ""}`}
            >
              <span className="step-dot" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    ) : (
    <div className="driver-dashboard">
      <Header />
      <button className="feedback-btn" onClick={feedBackModelShow}>
        <i class="bi bi-chat-quote"></i>
      </button>
      <button className="track-btn" onClick={() => setShow(true)}>
        <i class="bi bi-bus-front-fill"></i>
      </button>
      <div className="container mt-4">
        <div className="driver-header">
          <h3 className="driver-name">Welcome back, {driver?.name} </h3>
          <button
            className="notify-btn"
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
            type="button"
          >
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
          </button>
        </div>
        <Row>
          <Col md={6} className="mt-4">
            <Card className="driver-card">
              <CardBody>
                <h5>Driver Details</h5>
                <hr />
                <p>Name : {driver?.name}</p>
                <p>Driver ID : {driver?.driverId}</p>
                <p>Phone : {driver?.phone}</p>
                <p>
                  Duty Assigned :{" "}
                  {dutyAssign ? (
                    <Badge bg="success">Yes</Badge>
                  ) : (
                    <Badge bg="danger">No</Badge>
                  )}
                </p>
              </CardBody>
            </Card>

            <Card className="driver-card mt-4">
              <CardBody>
                <h5>Bus Details</h5>
                <hr />
                <p>Bus No : {bus?.busNo || "-"}</p>
                <p>Route : {bus?.routeName || "-"}</p>
                <p>
                  <strong>Timing</strong>
                </p>
                <p>
                  Morning : {bus?.tripStartMorning || "--:--"} to {bus?.tripEndMorning || "--:--"}
                </p>
                <p>
                  Evening : {bus?.tripStartEvening || "--:--"} to{" "}
                  {bus?.tripEndEvening || "--:--"}{" "}
                </p>
                <Button
                  className="soft-btn mt-2"
                  onClick={complaintModalShow}
                  disabled={!bus?.busNo}
                >
                  Bus Complaint
                </Button>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} className="mt-4">
            {/* ========================Announcement================================== */}
            <Card className="driver-card">
              <CardBody>
                <h5>Announcement</h5>
                <hr />
                {announcement.length === 0 ? (
                  <p>No announcements available</p>
                ) : (
                  announcement.map((item, index) => (
                    <div key={index} className="announcement-item">
                      <h6>{item.title}</h6>
                      <p>{item.message}</p>
                      <small className="text-muted">
                        {new Date(item.createdAt).toLocaleString()}
                      </small>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            {/* ======================== Leave================================== */}

            <Card className="driver-card mt-4 mb-4">
              <CardBody>
                <Tabs
                  activeKey={key}
                  onSelect={(k) => setKey(k)}
                  className="mb-3"
                >
                  <Tab eventKey="details" title="Leave Details">
                    <h5>Leave Details</h5>
                    <hr />
                    <Table responsive="sm" className="soft-table">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center">
                              No leave records found
                            </td>
                          </tr>
                        ) : (
                          leaves.map((leave, index) => (
                            <tr key={leave._id}>
                              <td>{index + 1}</td>
                              <td>
                                {new Date(leave.fromDate).toLocaleDateString()}
                              </td>
                              <td>
                                {new Date(leave.toDate).toLocaleDateString()}
                              </td>
                              <td>
                                <Badge
                                  bg={
                                    leave.status === "approved"
                                      ? "success"
                                      : leave.status === "rejected"
                                        ? "danger"
                                        : "warning"
                                  }
                                >
                                  {leave.status}
                                </Badge>
                              </td>
                              <td className="d-flex justify-content-center gap-2">
                                <Button
                                  size="sm"
                                  className="soft-view-btn"
                                  onClick={() => {
                                    setSelectedLeave(leave);
                                    ModelShow();
                                  }}
                                >
                                  View
                                </Button>

                                {leave.status === "waiting" && (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleDeleteLeave(leave._id)}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </Tab>

                  <Tab eventKey="apply" title="Leave Apply">
                    <h5>Leave Apply</h5>
                    <hr />

                    <Form onSubmit={handleLeaveSubmit}>
                      <Form.Group className="mt-4">
                        <Row>
                          <Col md={6}>
                            <Form.Label>From Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                              required className="soft-input"
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              required className="soft-input"
                            />
                          </Col>
                        </Row>
                      </Form.Group>

                      <Form.Group className="mt-4">
                        <Row>
                          <Col md={6}>
                            <Form.Label>From Time</Form.Label>
                            <Form.Control
                              type="time"
                              value={fromTime}
                              onChange={(e) => setFromTime(e.target.value)}
                              required className="soft-input"
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Time</Form.Label>
                            <Form.Control
                              type="time"
                              value={toTime}
                              onChange={(e) => setToTime(e.target.value)}
                              required className="soft-input"
                            />
                          </Col>
                        </Row>
                      </Form.Group>

                      <Form.Group className="mt-4">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required className="soft-input"
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        className="w-100 mt-4 soft-btn"
                        style={{
                          backgroundColor: "blueviolet",
                          color: "white",
                        }}
                        disabled={loadingLeave}
                      >
                        {loadingLeave ? "Submitting..." : "Submit"}
                      </Button>
                    </Form>
                  </Tab>

                 
                </Tabs>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Leave Details Model */}

      <Modal show={modelShow} onHide={ModelClose} centered className="model-content">
        <Modal.Header closeButton>
          <Modal.Title>Leave Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {selectedLeave && (
            <Row>
              <p>
                Status :{" "}
                <Badge
                  bg={
                    selectedLeave.status === "approved"
                      ? "success"
                      : selectedLeave.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {selectedLeave.status}
                </Badge>
              </p>

              <Col md={6}>
                <p>
                  <strong>From Date:</strong>{" "}
                  {new Date(selectedLeave.fromDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>From Time:</strong> {selectedLeave.fromTime}
                </p>
              </Col>

              <Col md={6}>
                <p>
                  <strong>To Date:</strong>{" "}
                  {new Date(selectedLeave.toDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>To Time:</strong> {selectedLeave.toTime}
                </p>
              </Col>

              <p>
                <strong>Reason:</strong>
              </p>
              <p>{selectedLeave.reason}</p>

              {selectedLeave.adminRemark && (
                <>
                  <p>
                    <strong>Admin Remark:</strong>
                  </p>
                  <p>{selectedLeave.adminRemark}</p>
                </>
              )}
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* =====================feedback modal============= */}
      <Modal show={feedBackModel} onHide={feedBackModelClose} centered className="model-content">
        <Modal.Header closeButton>
          <h4>Feed Back Form</h4>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFeedbackSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={category} className="soft-input"
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="driver">Driver</option>
                <option value="bus">Bus</option>
                <option value="route">Route</option>
                <option value="timing">Timing</option>
                <option value="general">General</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rate Us</Form.Label>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`bi ${
                      star <= rating ? "bi-star-fill text-warning" : "bi-star"
                    }`}
                    style={{
                      fontSize: "25px",
                      cursor: "pointer",
                      marginRight: "5px",
                    }}
                    onClick={() => setRating(star)}
                  ></i>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea" className="soft-input"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </Form.Group>

            <button
              type="submit"
              disabled={loadingFeedback}
              className="btn w-100 mt-4 soft-btn"
                  >
              {loadingFeedback ? "Submitting..." : "Submit"}
            </button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* =======tracking model======== */}
      <Modal
        show={show}
        onHide={() => setShow(false)}
        size="lg"
        centered
        dialogClassName="tracking-modal"
        contentClassName="tracking-modal-content"
      >
        <Modal.Header closeButton>
          <Modal.Title>Bus Tracking</Modal.Title>
        </Modal.Header>

        {/* <Modal.Body>
          <div className="timeline-container">
          
            <div className="timeline-line"></div>

          
            <div
              className="timeline-progress"
              style={{ height: `${progress}%` }}
            ></div>

        
            {busData.stops.map((stop, index) => (
              <div key={index} className="timeline-item">
                <div className="time">{stop.time}</div>

                <div
                  className={`circle
                    ${index < currentIndex ? "completed" : ""}
                    ${index === currentIndex ? "current" : ""}
                    ${index === currentIndex + 1 ? "next" : ""}
                  `}
                ></div>

                <div className="stop-name">{stop.name}</div>
              </div>
            ))}
          </div>
        </Modal.Body> */}
        <Modal.Body className="tracking-modal-body">
          <DriverTrackingPage/>
        </Modal.Body>
      </Modal>

      <Modal show={complaintModal} onHide={complaintModalClose} centered className="model-content">
        <Modal.Header closeButton>
          <h4>Bus Condition Complaint</h4>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleComplaintSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Issue Type</Form.Label>
              <Form.Select
                className="soft-input"
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
              >
                <option value="puncture">Puncture</option>
                <option value="breakdown">Breakdown</option>
                <option value="brake">Brake Issue</option>
                <option value="engine">Engine Issue</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="soft-input"
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Describe the issue"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Photo Attachments</Form.Label>
              <Form.Control
                type="file"
                className="soft-input"
                multiple
                accept="image/*"
                onChange={(e) => setComplaintPhotos(e.target.files)}
              />
            </Form.Group>

            <button type="submit" className="btn w-100 mt-3 soft-btn" disabled={complaintLoading}>
              {complaintLoading ? "Submitting..." : "Submit Complaint"}
            </button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal
        show={showCancelLeaveConfirm}
        onHide={closeCancelLeaveConfirm}
        centered
        className="model-content"
      >
        <Modal.Header closeButton={!cancelLeaveLoading}>
          <Modal.Title>Cancel Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>Warning:</strong> This will cancel your pending leave request.
          </p>
          <p className="mb-0">Do you want to continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={closeCancelLeaveConfirm}
            disabled={cancelLeaveLoading}
          >
            No, Keep It
          </Button>
          <Button
            className="soft-btn-danger"
            onClick={confirmDeleteLeave}
            disabled={cancelLeaveLoading}
          >
            {cancelLeaveLoading ? "Cancelling..." : "Yes, Cancel Leave"}
          </Button>
        </Modal.Footer>
      </Modal>

      {showNotifications && (
        <>
          <div className="notify-overlay" onClick={() => setShowNotifications(false)} />
          <div className="notify-panel">
            <div className="notify-header">
              <div>
                <h6 className="mb-0">Notifications</h6>
                <small className="text-muted">
                  {unreadCount} unread
                </small>
              </div>
              <button className="notify-close" onClick={() => setShowNotifications(false)}>
                ×
              </button>
            </div>

            <div className="notify-actions">
              <button className="notify-mark" onClick={markAllRead}>
                Mark all as read
              </button>
              <button className="notify-clear" onClick={clearNotifications}>
                Clear all
              </button>
            </div>

            <div className="notify-list">
              {notifications.length === 0 && (
                <div className="notify-empty">No notifications</div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notify-item ${readIds.includes(n.id) ? "read" : "unread"}`}
                >
                  <div className="notify-dot" />
                  <div className="notify-content">
                    <div className="notify-title">{n.title}</div>
                    <div className="notify-message">{n.message}</div>
                    <div className="notify-time">
                      {new Date(n.time).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
    )
  );
}

export default DriverDashboard;
