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

function DriverDashboard() {
  const [key, setKey] = useState("apply");

  // Leave details model

  const [modelShow, setModelShow] = useState(false);
  const ModelClose = () => setModelShow(false);
  const ModelShow = () => setModelShow(true);

  const [feedBackModel, setFeedBackModel] = useState(false);
  const feedBackModelClose = () => setFeedBackModel(false);
  const feedBackModelShow = () => setFeedBackModel(true);



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

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const res = await API.get("/driver/profile");
        setDriver(res.data.driver || null);
        setBus(res.data.bus || null);
      } catch (err) {
        console.error("driver data fetching error", err);
      }
    };
    fetchDriver();
  }, []);

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

      setLeaveMessage(res.data.message);
      // Reset form
      setFromDate("");
      setToDate("");
      setFromTime("");
      setToTime("");
      setReason("");
    } catch (err) {
      setLeaveMessage(err.response?.data?.message || "Failed to apply leave");
    } finally {
      setLoadingLeave(false);
      alert("conform leave ?");
    }
  };

  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
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

  const handleDeleteLeave = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this leave?")) return;

    try {
      await API.delete(`/driver/leave/${id}`);

      setLeaves(leaves.filter((leave) => leave._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete leave");
    }
  };

const [category, setCategory] = useState("general");
const [message, setMessage] = useState("");
const [rating, setRating] = useState(3);
const [loadingFeedback, setLoadingFeedback] = useState(false);

const handleFeedbackSubmit = async (e) => {
  e.preventDefault();

  try {
    setLoadingFeedback(true);

    await API.post("/driver/feedback", {
      busNo: bus?.busNo,
      rating,
      category: category.toLowerCase(),
      message
    });

    alert("Feedback submitted successfully");

    setCategory("general");
    setMessage("");
    setRating(3);

  } catch (err) {
    alert(err.response?.data?.message || "Failed to submit feedback");
  } finally {
    setLoadingFeedback(false);
  }
};









  // ===========================================frontend===================================================================

  return (
    <div>
      <Header />
      <button className="feedback-btn" onClick={feedBackModelShow}>
        <i class="bi bi-chat-quote"></i>
      </button>
      <button className="track-btn" onClick={() => setShow(true)}>
        <i class="bi bi-bus-front-fill"></i>
      </button>
      <div className="container mt-4">
        <h3>Welcome back, {driver?.name} </h3>
        <Row>
          <Col md={6} className="mt-4">
            <Card className="p-3 shadow">
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

            <Card className="shadow mt-4 p-3">
              <CardBody>
                <h5>Bus Details</h5>
                <hr />
                <p>Bus No : {bus?.busNo}</p>
                <p>Route : {bus?.routeName}</p>
                <p>
                  <strong>Timing</strong>
                </p>
                <p>
                  Morning : {bus?.tripStartMorning} to {bus?.tripEndMorning}
                </p>
                <p>
                  Evening : {bus?.tripStartEvening} to{" "}
                  {bus?.tripEndEvening}{" "}
                </p>
                <p></p>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} className="mt-4">
            {/* ========================Announcement================================== */}
            <Card className="shadow p-3">
              <CardBody>
                <h5>Announcement</h5>
                <hr />
                {announcement.length === 0 ? (
                  <p>No announcements available</p>
                ) : (
                  announcement.map((item, index) => (
                    <div key={index} className="mb-3">
                      <h6>{item.title}</h6>
                      <p>{item.message}</p>
                      <small className="text-muted">
                        {new Date(item.createdAt).toLocaleString()}
                      </small>
                      <hr />
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            {/* ======================== Leave================================== */}

            <Card className="shadow mt-4 p-3 mb-4">
              <CardBody>
                <Tabs
                  activeKey={key}
                  onSelect={(k) => setKey(k)}
                  className="mb-3"
                >
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
                              required
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              required
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
                              required
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Time</Form.Label>
                            <Form.Control
                              type="time"
                              value={toTime}
                              onChange={(e) => setToTime(e.target.value)}
                              required
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
                          required
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        className="w-100 mt-4"
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

                  <Tab eventKey="details" title="Leave Details">
                    <h5>Leave Details</h5>
                    <hr />
                    <Table striped bordered hover responsive="sm">
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
                </Tabs>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Leave Details Model */}

      <Modal show={modelShow} onHide={ModelClose} centered>
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
        <p><strong>From Date:</strong> {new Date(selectedLeave.fromDate).toLocaleDateString()}</p>
        <p><strong>From Time:</strong> {selectedLeave.fromTime}</p>
      </Col>

      <Col md={6}>
        <p><strong>To Date:</strong> {new Date(selectedLeave.toDate).toLocaleDateString()}</p>
        <p><strong>To Time:</strong> {selectedLeave.toTime}</p>
      </Col>

      <p><strong>Reason:</strong></p>
      <p>{selectedLeave.reason}</p>

      {selectedLeave.adminRemark && (
        <>
          <p><strong>Admin Remark:</strong></p>
          <p>{selectedLeave.adminRemark}</p>
        </>
      )}
    </Row>
  )}
</Modal.Body>

      </Modal>

      {/* =====================feedback modal============= */}
      <Modal show={feedBackModel} onHide={feedBackModelClose} centered>
        <Modal.Header closeButton>
          <h4>Feed Back Form</h4>
        </Modal.Header>
        <Modal.Body>
         <Form onSubmit={handleFeedbackSubmit}>
  <Form.Group className="mb-3">
    <Form.Label>Category</Form.Label>
    <Form.Select
      value={category}
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
      as="textarea"
      rows={3}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      required
    />
  </Form.Group>

  <button
    type="submit"
    disabled={loadingFeedback}
    className="btn w-100 mt-4"
    style={{ backgroundColor: "blueviolet", color: "white" }}
  >
    {loadingFeedback ? "Submitting..." : "Submit"}
  </button>
</Form>

        </Modal.Body>
      </Modal>

      {/* =======tracking model======== */}
      <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Bus Tracking</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="timeline-container">
            {/* Vertical Line Background */}
            <div className="timeline-line"></div>

            {/* Vertical Progress Line */}
            <div
              className="timeline-progress"
              style={{ height: `${progress}%` }}
            ></div>

            {/* Stops */}
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
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default DriverDashboard;
