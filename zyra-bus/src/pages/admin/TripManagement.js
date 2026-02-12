import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Badge,
  Row,
  Col,
  Alert,
  Card
} from "react-bootstrap";
import API from "../../api";

export default function TripManagement() {

  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);

  const [formData, setFormData] = useState({
    busNo: "",
    direction: "outbound",
    totalTime: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // 🔹 Fetch Buses
  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  // 🔹 Fetch Trips
  const fetchTrips = async () => {
    const res = await API.get("/admin/trip-list"); // we will add this route
    setTrips(res.data);
  };

  useEffect(() => {
    fetchBuses();
    fetchTrips();
  }, []);

  // 🔹 Create Trip
  const handleCreateTrip = async () => {
    setError("");
    setMessage("");

    if (!formData.busNo || !formData.totalTime) {
      setError("All fields required");
      return;
    }

    try {
      const res = await API.post("/admin/trip", {
        busNo: formData.busNo,
        direction: formData.direction,
        totalTime: Number(formData.totalTime)
      });

      setMessage("Trip created successfully");

      setFormData({
        busNo: "",
        direction: "outbound",
        totalTime: ""
      });

      fetchTrips();

    } catch (err) {
      setError(err.response?.data?.message || "Error creating trip");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "planned":
        return <Badge bg="secondary">Planned</Badge>;
      case "running":
        return <Badge bg="success">Running</Badge>;
      case "paused":
        return <Badge bg="warning">Paused</Badge>;
      case "completed":
        return <Badge bg="primary">Completed</Badge>;
      default:
        return <Badge bg="dark">{status}</Badge>;
    }
  };

  return (
    <div>
      <h3>Trip Management</h3>

      {/* 🔥 CREATE TRIP CARD */}
      <Card className="p-3 mb-4">
        <h5>Create New Trip</h5>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Row>
          <Col md={3}>
            <Form.Select
              value={formData.busNo}
              onChange={(e) =>
                setFormData({ ...formData, busNo: e.target.value })
              }
            >
              <option value="">Select Bus</option>
              {buses.map((b) => (
                <option key={b._id} value={b.busNo}>
                  {b.busNo} - {b.routeName}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={3}>
            <Form.Select
              value={formData.direction}
              onChange={(e) =>
                setFormData({ ...formData, direction: e.target.value })
              }
            >
              <option value="outbound">Outbound</option>
              <option value="return">Return</option>
            </Form.Select>
          </Col>

          <Col md={3}>
            <Form.Control
              type="number"
              placeholder="Total Time (minutes)"
              value={formData.totalTime}
              onChange={(e) =>
                setFormData({ ...formData, totalTime: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Button onClick={handleCreateTrip}>
              Create Trip
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 🔥 TRIP TABLE */}
      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Bus No</th>
            <th>Direction</th>
            <th>Total Time</th>
            <th>Status</th>
            <th>Created At</th>
          </tr>
        </thead>

        <tbody>
          {trips.map((trip) => (
            <tr key={trip._id}>
              <td>{trip.busNo}</td>
              <td>{trip.direction}</td>
              <td>{trip.totalTime} mins</td>
              <td>{getStatusBadge(trip.status)}</td>
              <td>
                {new Date(trip.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
