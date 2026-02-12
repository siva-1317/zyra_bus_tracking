import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import {
  Container,
  Row,
  Col,
  Card
} from "react-bootstrap";
import API from "../../api";

function StudentDashboard() {

  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [driver, setDriver] = useState(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await API.get("/student/profile");
      setStudent(res.data.student);
      setDriver(res.data.driver);
      setBus(res.data.bus);
    } catch (err) {
      console.error("Error fetching student data:", err);
    }
  };

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setStudent(prev => ({ ...prev }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /* ================= LOGIC VARIABLES ================= */

  let stopTime = "Not Available";
  let startStop = "";
  let endStop = "";

  let routeStops = [];
  let progress = 0;
  let currentIndex = -1;
  let isMorning = true;

  if (bus?.stops?.length > 0 && student) {

    const now = new Date();
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    isMorning = currentMinutes < 12 * 60;

    /* ===== STUDENT STOP ===== */
    const studentStop = bus.stops.find(
      s =>
        s.stopName?.toLowerCase().trim() ===
        student.busStop?.toLowerCase().trim()
    );

    const collegeStop =
      bus.stops[bus.stops.length - 1];

    if (studentStop && collegeStop) {

      if (isMorning) {
        startStop = studentStop.stopName;
        endStop = collegeStop.stopName;
      } else {
        startStop = collegeStop.stopName;
        endStop = studentStop.stopName;
      }

      stopTime = isMorning
        ? studentStop.morningTime
        : studentStop.eveningTime;
    }

    /* ===== ROUTE DIRECTION ===== */

    routeStops = isMorning
      ? [...bus.stops]
      : [...bus.stops].reverse();

    const getMinutes = (time) => {
      if (!time) return 0;
      const [h, m] = time.split(":");
      return Number(h) * 60 + Number(m);
    };

    const times = routeStops.map(stop =>
      getMinutes(
        isMorning ? stop.morningTime : stop.eveningTime
      )
    );

    const tripStart = times[0];
    const tripEnd = times[times.length - 1];

    if (currentMinutes <= tripStart) {
      progress = 0;
    } else if (currentMinutes >= tripEnd) {
      progress = 100;
    } else {
      progress =
        ((currentMinutes - tripStart) /
          (tripEnd - tripStart)) * 100;
    }

    currentIndex = times.findIndex(
      t => currentMinutes < t
    );

    if (currentIndex === -1) {
      currentIndex = routeStops.length;
    }
  }

  /* ================= UI ================= */

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
                <p><strong>Name:</strong> {student?.name}</p>
                <p><strong>Roll:</strong> {student?.rollNumber}</p>
                <p><strong>Department:</strong> {student?.department}</p>
                <p><strong>Year:</strong> {student?.year}</p>
                <p><strong>Contact:</strong> {student?.phone}</p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mt-4 shadow p-3">
              <Card.Body>
                <h5>Bus Details</h5>
                <hr />
                <p><strong>Assigned Bus:</strong> {student?.assignedBus}</p>
                <p><strong>Bus Stop:</strong> {student?.busStop}</p>
                <p><strong>Timing:</strong> {stopTime}</p>
                <p><strong>Driver:</strong> {driver?.name || "Not Assigned"}</p>
                <p><strong>Contact:</strong> {driver?.phone || "-"}</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ================= ROUTE PROGRESS ================= */}

        <Card className="mt-4 shadow p-4" style={{maxHeight:"500px"}}>
          <Card.Body>

            <h5>Bus Route</h5>

            {routeStops.length > 0 && (
              <div style={{ position: "relative", paddingTop: "40px" }}>

                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: 0,
                    right: 0,
                    height: "6px",
                    background: "#ddd",
                    borderRadius: "4px"
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: 0,
                    width: `${progress}%`,
                    height: "6px",
                    background: "#6f42c1",
                    borderRadius: "4px",
                    transition: "width 0.5s ease"
                  }}
                />

                {routeStops.map((stop, index) => {

                  const percent =
                    (index / (routeStops.length - 1)) * 100;

                  const isPassed = index < currentIndex;
                  const isStudent =
                    stop.stopName === student?.busStop;

                  return (
                    <div
                      key={index}
                      style={{
                        position: "absolute",
                        left: `${percent}%`,
                        transform: "translateX(-50%)",
                        textAlign: "center"
                      }}
                    >

                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: isStudent
                            ? "#6f42c1"
                            : isPassed
                            ? "green"
                            : "#aaa",
                          border: "2px solid white",
                          marginBottom: "6px"
                        }}
                      />

                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: isStudent ? "bold" : "normal",
                          color: isStudent
                            ? "#6f42c1"
                            : isPassed
                            ? "green"
                            : "#555"
                        }}
                      >
                        {stop.stopName}
                      </div>

                      <div style={{ fontSize: "10px", color: "#777" }}>
                        {isMorning
                          ? stop.morningTime
                          : stop.eveningTime}
                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </Card.Body>
        </Card>

        <Card className="mt-4 shadow p-3">
          <Card.Body>
            <h5>Announcements</h5>
            <hr />
            <p>No new announcements</p>
          </Card.Body>
        </Card>

      </Container>
    </div>
  );
}

export default StudentDashboard;
