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
  const [drivers, setDrivers] = useState([]);
  

  /* ================= FETCH ================= */

  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };
const fetchDrivers = async () => {
  const res = await API.get("/admin/driver");
  setDrivers(res.data);
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
    fetchDrivers()
  }, []);

  /* ================= CREATE TRIP ================= */

const handleCreateTrip = async () => {
  setError("");
  setMessage("");

  const {
    busNo,
    driverId,
    fromDate,
    toDate,
    startTime,
    endTime,
    destination,
    reason
  } = formData;

  if (
    !busNo ||
    !driverId ||
    !fromDate ||
    !toDate ||
    !startTime ||
    !endTime ||
    !destination ||
    !reason
  ) {
    setError("All fields required");
    return;
  }

  try {
    await API.post("/admin/event-trip", formData);

    setMessage("Event Trip Created Successfully");

    setFormData({
      busNo: "",
      driverId: "",
      fromDate: "",
      toDate: "",
      startTime: "",
      endTime: "",
      destination: "",
      reason: ""
    });

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
        <Tab eventKey="create" title="Create Event Trip">
  <Card className="p-4 shadow-sm">
    <h5 className="mb-3">Create IV / Event Trip</h5>

    {error && <Alert variant="danger">{error}</Alert>}
    {message && <Alert variant="success">{message}</Alert>}

    <Row className="g-3">

      {/* Bus */}
      <Col md={4}>
        <Form.Label>Select Bus</Form.Label>
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

      {/* Driver */}
      <Col md={4}>
        <Form.Label>Assign Driver</Form.Label>
        <Form.Select
          value={formData.driverId}
          onChange={(e) =>
            setFormData({ ...formData, driverId: e.target.value })
          }
        >
          <option value="">Select Driver</option>
          {drivers.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name} - {d.driverId}
            </option>
          ))}
        </Form.Select>
      </Col>

      {/* Destination */}
      <Col md={4}>
        <Form.Label>Destination</Form.Label>
        <Form.Control
          type="text"
          placeholder="Enter destination"
          value={formData.destination}
          onChange={(e) =>
            setFormData({ ...formData, destination: e.target.value })
          }
        />
      </Col>

      {/* From Date */}
      <Col md={3}>
        <Form.Label>From Date</Form.Label>
        <Form.Control
          type="date"
          value={formData.fromDate}
          onChange={(e) =>
            setFormData({ ...formData, fromDate: e.target.value })
          }
        />
      </Col>

      {/* To Date */}
      <Col md={3}>
        <Form.Label>To Date</Form.Label>
        <Form.Control
          type="date"
          value={formData.toDate}
          onChange={(e) =>
            setFormData({ ...formData, toDate: e.target.value })
          }
        />
      </Col>

      {/* Start Time */}
      <Col md={3}>
        <Form.Label>Start Time</Form.Label>
        <Form.Control
          type="time"
          value={formData.startTime}
          onChange={(e) =>
            setFormData({ ...formData, startTime: e.target.value })
          }
        />
      </Col>

      {/* End Time */}
      <Col md={3}>
        <Form.Label>End Time</Form.Label>
        <Form.Control
          type="time"
          value={formData.endTime}
          onChange={(e) =>
            setFormData({ ...formData, endTime: e.target.value })
          }
        />
      </Col>

      {/* Reason */}
      <Col md={12}>
        <Form.Label>Reason / Event Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Industrial Visit / Club Event / Competition"
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
        />
      </Col>

      {/* Submit */}
      <Col md={12} className="text-end">
        <Button variant="success" onClick={handleCreateTrip}>
          Create Event Trip
        </Button>
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
