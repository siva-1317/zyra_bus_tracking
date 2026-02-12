import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { Container, Row, Col, Card } from "react-bootstrap";
import API from "../../api";

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [stopDetails, setStopDetails] = useState(null);
  const [time, setTime] = useState(new Date());

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
  const isMorning = currentHours < 12 || currentHours >= 19;
  const convertToMinutes = (timeString) => {
    if (!timeString) return 0;

    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  };

  let busStartTime = 0;
  let busEndTime = 0;
  let studentStopTime = "-";

  if (bus && stopDetails) {
    if (isMorning) {
      busStartTime = bus.tripStartMorning || 0;
      busEndTime = bus.tripEndMorning || 0;
      studentStopTime = stopDetails.morningTime || "-";
    } else {
      busStartTime = bus.tripStartEvening || 0;
      busEndTime = bus.tripEndEvening || 0;
      studentStopTime = stopDetails.eveningTime || "-";
    }
  }

  const stopTimeInMinutes = convertToMinutes(studentStopTime);

  const timeDifference = stopTimeInMinutes - currentTime;

  const track =
    convertToMinutes(busStartTime) < currentTime &&
    currentTime < convertToMinutes(busEndTime);

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
                  <strong>Roll:</strong> {student?.rollNumber}
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
            {track ? (
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
            <p>No new announcements</p>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default StudentDashboard;
