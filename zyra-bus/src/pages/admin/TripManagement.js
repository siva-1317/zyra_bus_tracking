import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Badge,
  Row,
  Col,
  Alert,
  Card,
  Tabs,
  Tab,
} from "react-bootstrap";
import API from "../../api";

export default function TripManagement() {
  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);

  const [activeTab, setActiveTab] = useState("create");

  const [formData, setFormData] = useState({
    busNo: "",
    direction: "outbound",
    totalTime: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ================= FETCH ================= */

  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  const fetchTrips = async () => {
    const res = await API.get("/admin/trip-list");
    setTrips(res.data.filter((t) => t.status !== "completed"));
  };

  const fetchHistory = async () => {
    const res = await API.get("/admin/trip-list");
    setHistoryTrips(res.data.filter((t) => t.status === "completed"));
  };

  useEffect(() => {
    fetchBuses();
    fetchTrips();
    fetchHistory();
  }, []);

  /* ================= CREATE TRIP ================= */

  const handleCreateTrip = async () => {
    setError("");
    setMessage("");

    if (!formData.busNo || !formData.totalTime) {
      setError("All fields required");
      return;
    }

    try {
      await API.post("/admin/trip", {
        busNo: formData.busNo,
        direction: formData.direction,
        totalTime: Number(formData.totalTime),
      });

      setMessage("Trip created successfully");

      setFormData({
        busNo: "",
        direction: "outbound",
        totalTime: "",
      });

      fetchTrips();
      setActiveTab("active");
    } catch (err) {
      setError(err.response?.data?.message || "Error creating trip");
    }
  };

  /* ================= DELETE HISTORY ================= */

  const deleteTrip = async (id) => {
    if (!window.confirm("Delete this trip permanently?")) return;

    await API.delete(`/admin/trip-history/${id}`);
    fetchHistory();
  };

  /* ================= STATUS BADGE ================= */

  const getStatusBadge = (status) => {
    switch (status) {
      case "running":
        return <Badge bg="success">Running</Badge>;
      case "paused":
        return <Badge bg="warning">Paused</Badge>;
      case "completed":
        return <Badge bg="primary">Completed</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <h3 className="mb-4">Trip Management</h3>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        {/* ================= CREATE TAB ================= */}
        <Tab eventKey="create" title="Create Trip">
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
                <Button onClick={handleCreateTrip}>Create Trip</Button>
              </Col>
            </Row>
          </Card>
        </Tab>

        {/* ================= ACTIVE TRIPS TAB ================= */}
        <Tab eventKey="active" title="Active Trips">
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Bus No</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((trip) => (
                <tr key={trip._id}>
                  <td>{trip.busNo}</td>
                  <td>{getStatusBadge(trip.status)}</td>
                  <td>
                    {trip.createdAt
                      ? new Date(trip.createdAt).toLocaleString()
                      : trip.startTime
                        ? new Date(trip.startTime).toLocaleString()
                        : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>

        {/* ================= HISTORY TAB ================= */}
        <Tab eventKey="history" title="Trip History">
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Bus No</th>
                <th>Total Time</th>
                <th>Status</th>
                <th>Ended At</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {historyTrips.map((trip) => (
                <tr key={trip._id}>
                  <td>{trip.busNo}</td>
                  <td>
                    <td>
                      {trip.totalTime
                        ? `${trip.totalTime} mins`
                        : trip.startTime && trip.endTime
                          ? `${Math.round(
                              (new Date(trip.endTime) -
                                new Date(trip.startTime)) /
                                60000,
                            )} mins`
                          : "-"}
                    </td>{" "}
                  </td>
                  <td>{getStatusBadge(trip.status)}</td>
                  <td>
                    {trip.endTime
                      ? new Date(trip.endTime).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteTrip(trip._id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </div>
  );
}
