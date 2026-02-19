import React from "react";
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


function DriverDashboard() {
  const [key, setKey] = useState("apply");

  // Leave details model

  const [modelShow, setModelShow] = useState(false);
  const ModelClose = () => setModelShow(false);
  const ModelShow = () => setModelShow(true);

  const [feedBackModel, setFeedBackModel] = useState(false);
  const feedBackModelClose = () => setFeedBackModel(false);
  const feedBackModelShow = () => setFeedBackModel(true);

  const [rating, setRating] = useState(0);


  const [show, setShow] = useState(false);

  const currentIndex = 4;

  const busData = {
    stops: [
      { name: "New Delhi", time: "12:03 AM" },
      { name: "Ghaziabad", time: "02:13 AM" },
      { name: "Moradabad", time: "03:33 AM" },
      { name: "Bareilly", time: "04:42 AM" },
      { name: "Lucknow", time: "07:25 AM" }
    ]
  };
  const totalStops = busData.stops.length;
  const progress = (currentIndex / (totalStops - 1)) * 100;


  return (
    <div>
      <Header />
      <button className="feedback-btn" onClick={feedBackModelShow}>
        <i class="bi bi-chat-quote"></i>
      </button>
      <button
        className="track-btn"
        onClick={() => setShow(true)}
      >
        <i class="bi bi-bus-front-fill"></i>
      </button>
      <div className="container mt-4">
        <h3>Welcome, Driver !</h3>
        <Row>
          <Col md={6} className="mt-4">
            <Card className="p-3 shadow">
              <CardBody>
                <h5>Driver Details</h5>
                <hr />
                <p>Name :</p>
                <p>Driver ID :</p>
                <p>Phone :</p>
                <p>
                  Duty Assigned : <Badge bg="success">Yes</Badge>{" "}
                </p>
              </CardBody>
            </Card>

            <Card className="shadow mt-4 p-3">
              <CardBody>
                <h5>Bus Details</h5>
                <hr />
                <p>Bus No :</p>
                <p>Route :</p>
                <p>Timing</p>
                <p>Morning : </p>
                <p>Evening : </p>
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
                <p>No announcement....</p>
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
                    <Form>
                      <Form.Group className="mt-4">
                        <Row>
                          <Col md={6}>
                            <Form.Label>From Date</Form.Label>
                            <Form.Control placeholder="From Date" type="date" />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Date</Form.Label>
                            <Form.Control placeholder="To Date" type="date" />
                          </Col>
                        </Row>
                      </Form.Group>

                      <Form.Group className="mt-4">
                        <Row>
                          <Col md={6}>
                            <Form.Label>From Time</Form.Label>
                            <Form.Control placeholder="From Date" type="time" />
                          </Col>
                          <Col md={6}>
                            <Form.Label>To Time</Form.Label>
                            <Form.Control placeholder="To Date" type="time" />
                          </Col>
                        </Row>
                      </Form.Group>

                      <Form.Group className="mt-4">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control as="textarea" rows={3} />
                      </Form.Group>
                      <button  type="submit" className="btn w-100 mt-4" style={{backgroundColor:"blueviolet",color:"white"}}>submit</button>
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
                        <tr>
                          <td>1</td>
                          <td>2026-02-10</td>
                          <td>2026-02-12</td>
                          <td>
                            {" "}
                            <Badge bg="success">Approved</Badge>{" "}
                          </td>
                          <td className="d-flex justify-content-center">
                            <Button size="sm" onClick={ModelShow}>
                              View
                            </Button>
                          </td>
                        </tr>
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
          <Row>
            <p>
              Status : <Badge bg="success">Approved</Badge>{" "}
            </p>
            <Col md={6}>
              <p>From Date :</p>
              <p>From Time :</p>
            </Col>
            <Col md={6}>
              <p>To Date :</p>
              <p>To Time :</p>
            </Col>
            <p>Remark:</p>
            <p>Admin Remarks .....</p>
            <p>Reason :</p>
            <p>Leave reason....</p>
          </Row>
          
        </Modal.Body>
      </Modal>

      {/* =====================feedback modal============= */}
      <Modal show={feedBackModel} onHide={feedBackModelClose} centered>
        <Modal.Header closeButton>
          <h4>Feed Back Form</h4>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select>
                <option></option>
                <option>Driver</option>
                <option>Bus</option>
                <option>Route</option>
                <option>Timing</option>
                <option>General</option>
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
              <Form.Control as="textarea" rows={3} placeholder="enter the feedback"></Form.Control>
            </Form.Group>
            <button  type="submit" className="btn w-100 mt-4" style={{backgroundColor:"blueviolet",color:"white"}}>submit</button>
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
