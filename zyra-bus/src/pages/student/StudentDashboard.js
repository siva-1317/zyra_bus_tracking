import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { Container, Row, Col, Card, Modal, Form, Button } from "react-bootstrap";
import API from "../../api";

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [stopDetails, setStopDetails] = useState(null);
  const [time, setTime] = useState(new Date());
  const [announcement,setAnnouncement] = useState([]);

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
    alert(err.response?.data?.message || "Error assigning stop");
  }

  setStopLoading(false);
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
 
  /* ================= LIVE CLOCK ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* ================= TIME CALCULATION ================= */

  const currentHours = time.getHours();
  const currentMinutes = time.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;
  const isMorning = currentHours >= 5 && currentHours < 12;

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



let busStartTime = null;
let busEndTime = null;
let studentStopTime = null;

if (bus && stopDetails) {
  if (isMorning) {
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
    const stopTime = isMorning ? stop.morningTime : stop.eveningTime;

    return {
      name: stop.stopName,
      time: stopTime,
      minutes: convertToMinutes(stopTime),
    };
  });

  // Find current stop index
  let currentStopIndex = -1;

  if (stopsWithTime) {
    for (let i = 0; i < stopsWithTime.length; i++) {
      if (currentTime >= stopsWithTime[i].minutes) {
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
console.log("Bus Start:", busStartTime);
console.log("Bus End:", busEndTime);
console.log("Track:", track);


  return (
    <div>
      <Header />

      <Container className="mt-4">
        <h3>Welcome, {student?.name}</h3>

        <Row>
          <Col md={6}>
            <Card className="mt-4 shadow p-3">
              <Card.Body>
                <h5>Student Details</h5>
                <hr />
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
            <Card className="mt-4 shadow p-3">
              <Card.Body>
                <h5>Bus Details</h5>
                <hr />
                <p>
                  <strong>Assigned Bus:</strong> {student?.assignedBus}
                </p>
                <p>
                  <strong>Bus Stop:</strong> {student?.busStop}
                </p>
                <p>
                  <strong>Timing:</strong> {studentStopTime}{" "}
                  {isMorning ? "AM" : "PM"}
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

        <Card className="mt-4 shadow p-3">
          <Card.Body>
            <h5>Where is my Bus</h5>
            <hr />
            {
              
              
              track ? (
              <>
                <p>
                  {timeDifference > 0 &&
                    `Bus arriving in ${timeDifference} minutes`}
                  {timeDifference === 0 && "Bus arriving now"}
                  {timeDifference < 0 &&
                    `Bus passed ${Math.abs(timeDifference)} minutes ago`}
                </p>

                {stopsWithTime?.length > 0 && (
                  <div className="mt-4">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      {stopsWithTime.map((stop, index) => (
                        <div
                          key={index}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            position: "relative",
                          }}
                        >
                          {/* Line */}
                          {index !== stopsWithTime.length - 1 && (
                            <div
                              style={{
                                position: "absolute",
                                top: 10,
                                left: "50%",
                                width: "100%",
                                height: 4,
                                backgroundColor:
                                  index < currentStopIndex ? "green" : "#ccc",
                                zIndex: 0,
                              }}
                            />
                          )}

                          {/* Circle */}
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              margin: "0 auto",
                              backgroundColor:
                                index <= currentStopIndex ? "green" : "#ccc",
                              border: "2px solid white",
                              zIndex: 1,
                              position: "relative",
                            }}
                          />

                          {/* Stop Info */}
                          <div style={{ marginTop: 8 }}>
                            <small>
                              <strong>{stop.name}</strong>
                            </small>
                            <br />
                            <small>{stop.time}</small>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-center mt-3">
                      {currentStopIndex === -1 && "Bus not started yet"}
                      {currentStopIndex >= 0 &&
                        currentStopIndex < stopsWithTime.length - 1 &&
                        `Bus reached ${stopsWithTime[currentStopIndex].name}`}
                      {currentStopIndex === stopsWithTime.length - 1 &&
                        "Bus reached final destination"}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>after bus starting the journey the ETA will be shown here</p>
            )}
          </Card.Body>
        </Card>

        <Card className="mt-4 shadow p-3">
          <Card.Body>
            <h5>Announcements</h5>
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
          </Card.Body>
        </Card>
      </Container>

<Modal show={showModal} backdrop="static" centered>
  <Modal.Header>
    <Modal.Title>Select Your Route & Stop</Modal.Title>
  </Modal.Header>

  <Modal.Body>
    <Form>

      {/* Route Dropdown */}
      <Form.Select
        className="mb-3"
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
      disabled={!selectedRoute || !selectedStop || stopLoading}
      onClick={handleStopSubmit}
    >
      {stopLoading ? "Assigning..." : "Confirm Selection"}
    </Button>
  </Modal.Footer>
</Modal>


    </div>
  );
}

export default StudentDashboard;
