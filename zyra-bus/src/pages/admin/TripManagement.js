import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Badge,
  Row,
  Col,
  Card,
  Tabs,
  Tab,
  Modal,
} from "react-bootstrap";
import API from "../../api";
import "../../styles/manage-trip-soft.css"
import { toast } from "../../utils/toast";

export default function TripManagement() {
  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);

  const [activeTab, setActiveTab] = useState("create");
  const [historySearchBus, setHistorySearchBus] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [selectedHistoryTripIds, setSelectedHistoryTripIds] = useState([]);

  const [formData, setFormData] = useState({
    busNo: "",
    direction: "outbound",
    totalTime: "",
    driverId: "",
    fromDate: "",
    toDate: "",
    startTime: "",
    endTime: "",
    destination: "",
    reason: "",
    eventStops: [],
  });

  const [drivers, setDrivers] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState("");
  const [deleteConfirmAction, setDeleteConfirmAction] = useState(null);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const [missingStopModal, setMissingStopModal] = useState(false);
  const [missingStopRows, setMissingStopRows] = useState([]);
  const [pendingTripPayload, setPendingTripPayload] = useState(null);
  const [editData, setEditData] = useState({
    busNo: "",
    driverId: "",
    fromDate: "",
    toDate: "",
    startTime: "",
    endTime: "",
    destination: "",
    reason: "",
  });
  

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

  const createEventTrip = async (payload) => {
    try {
      await API.post("/admin/event-trip", payload);

      toast.show({
        type: "success",
        title: "Create Trip",
        message: "Event Trip Created Successfully",
      });

      setFormData({
        busNo: "",
        driverId: "",
        fromDate: "",
        toDate: "",
        startTime: "",
        endTime: "",
        destination: "",
        reason: "",
        eventStops: [],
      });
      setPendingTripPayload(null);
      setMissingStopRows([]);
      setMissingStopModal(false);
      fetchTrips();
      fetchHistory();
    } catch (err) {
      if (err.response?.data?.code === "MISSING_STOPS") {
        const rows = (err.response?.data?.missingStops || []).map((s) => ({
          stopName: s.stopName,
          lat: "",
          lng: "",
        }));
        setMissingStopRows(rows);
        setPendingTripPayload(payload);
        setMissingStopModal(true);
        return;
      }
      toast.show({
        type: "error",
        title: "Create Trip",
        message: err.response?.data?.message || "Error creating trip",
      });
    }
  };

  const handleCreateTrip = async () => {
  const {
    busNo,
    driverId,
    fromDate,
    toDate,
    startTime,
    endTime,
    destination,
    reason,
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
    toast.show({
      type: "warning",
      title: "Create Trip",
      message: "All fields required",
    });
    return;
  }

    const payload = {
      busNo,
      driverId,
      fromDate,
      toDate,
      startTime,
      endTime,
      destination,
      reason,
      eventStops: (formData.eventStops || [])
        .map((s) => ({ stopName: String(s.stopName || "").trim() }))
        .filter((s) => s.stopName),
    };

    await createEventTrip(payload);
  };

  const addEventStop = () => {
    setFormData({
      ...formData,
      eventStops: [
        ...formData.eventStops,
        { stopName: "" },
      ],
    });
  };

  const updateEventStop = (index, field, value) => {
    const updated = [...formData.eventStops];
    updated[index][field] = value;
    setFormData({ ...formData, eventStops: updated });
  };

  const removeEventStop = (index) => {
    const updated = formData.eventStops.filter((_, i) => i !== index);
    setFormData({ ...formData, eventStops: updated });
  };

  const handleSaveMissingStops = async () => {
    const hasInvalid = missingStopRows.some(
      (s) =>
        !s.stopName ||
        Number.isNaN(Number(s.lat)) ||
        Number.isNaN(Number(s.lng)),
    );

    if (hasInvalid) {
      toast.show({
        type: "warning",
        title: "Missing Stops",
        message: "Provide latitude and longitude for all missing stops",
      });
      return;
    }

    try {
      await API.post("/admin/stops/bulk-upsert", {
        stops: missingStopRows.map((s) => ({
          stopName: s.stopName,
          lat: Number(s.lat),
          lng: Number(s.lng),
        })),
      });

      toast.show({
        type: "success",
        title: "Missing Stops",
        message: "Missing stops saved",
      });

      if (pendingTripPayload) {
        await createEventTrip(pendingTripPayload);
      } else {
        setMissingStopModal(false);
      }
    } catch (err) {
      toast.show({
        type: "error",
        title: "Missing Stops",
        message: err.response?.data?.message || "Failed to save missing stops",
      });
    }
  };

  /* ================= EDIT / DELETE ACTIVE ================= */

  const openEditModal = (trip) => {
    setEditingTrip(trip);
    setEditData({
      busNo: trip.busNo || "",
      driverId: trip.driverId?._id || trip.driverId || "",
      fromDate: trip.fromDate ? new Date(trip.fromDate).toISOString().slice(0, 10) : "",
      toDate: trip.toDate ? new Date(trip.toDate).toISOString().slice(0, 10) : "",
      startTime: trip.startTime || "",
      endTime: trip.endTime || "",
      destination: trip.destination || "",
      reason: trip.reason || "",
    });
    setShowEdit(true);
  };

  const handleUpdateTrip = async () => {
    if (!editingTrip?._id) return;

    try {
      await API.put(`/admin/trip/${editingTrip._id}`, editData);
      setShowEdit(false);
      setEditingTrip(null);
      fetchTrips();
      fetchHistory();
    } catch (err) {
      toast.show({
        type: "error",
        title: "Update Trip",
        message: err.response?.data?.message || "Error updating trip",
      });
    }
  };

  const deleteActiveTrip = async (id) => {
    try {
      await API.delete(`/admin/trip/${id}`);
      fetchTrips();
      fetchHistory();
      toast.show({
        type: "success",
        title: "Delete Trip",
        message: "Trip deleted successfully",
      });
    } catch (err) {
      toast.show({
        type: "error",
        title: "Delete Trip",
        message: err.response?.data?.message || "Error deleting trip",
      });
    }
  };

  /* ================= DELETE HISTORY ================= */

  const deleteTrip = async (id) => {
    try {
      await API.delete(`/admin/trip-history/${id}`);
      setSelectedHistoryTripIds((prev) => prev.filter((x) => x !== id));
      fetchHistory();
      toast.show({
        type: "success",
        title: "Delete Trip",
        message: "Trip history deleted successfully",
      });
    } catch (err) {
      toast.show({
        type: "error",
        title: "Delete Trip",
        message: err.response?.data?.message || "Error deleting trip history",
      });
    }
  };

  const openDeleteConfirm = (message, action) => {
    setDeleteConfirmMessage(message);
    setDeleteConfirmAction(() => action);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmMessage("");
    setDeleteConfirmAction(null);
  };

  const runDeleteConfirmAction = async () => {
    if (!deleteConfirmAction) return;
    try {
      setDeleteConfirmLoading(true);
      await deleteConfirmAction();
      closeDeleteConfirm();
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  const toggleHistoryTripSelection = (id) => {
    setSelectedHistoryTripIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const filteredHistoryTrips = historyTrips.filter((trip) => {
    const busMatch =
      !historySearchBus ||
      (trip.busNo || "")
        .toLowerCase()
        .includes(historySearchBus.toLowerCase());

    const statusMatch =
      !historyStatusFilter || trip.status === historyStatusFilter;

    const endedAt = trip.endTime ? new Date(trip.endTime) : null;
    const fromMatch =
      !historyFromDate || (endedAt && endedAt >= new Date(historyFromDate));
    const toMatch =
      !historyToDate || (endedAt && endedAt <= new Date(`${historyToDate}T23:59:59`));

    return busMatch && statusMatch && fromMatch && toMatch;
  });

  const handleSelectAllHistory = (checked) => {
    if (!checked) {
      setSelectedHistoryTripIds([]);
      return;
    }
    setSelectedHistoryTripIds(filteredHistoryTrips.map((t) => t._id));
  };

  const handleBulkDeleteHistory = async () => {
    if (selectedHistoryTripIds.length === 0) {
      toast.show({
        type: "warning",
        title: "Bulk Delete",
        message: "Select at least one history trip",
      });
      return;
    }

    const results = await Promise.allSettled(
      selectedHistoryTripIds.map((id) => API.delete(`/admin/trip-history/${id}`)),
    );
    const deletedCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - deletedCount;

    setSelectedHistoryTripIds([]);
    fetchHistory();

    if (deletedCount > 0) {
      toast.show({
        type: "success",
        title: "Bulk Delete",
        message: `${deletedCount} trip(s) deleted successfully`,
      });
    }
    if (failedCount > 0) {
      toast.show({
        type: "error",
        title: "Bulk Delete",
        message: `${failedCount} trip(s) failed to delete`,
      });
    }
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
  <div className="trip-container">

    <h3 className="page-title">Trip Management</h3>

    <Tabs
      activeKey={activeTab}
      onSelect={(k) => setActiveTab(k)}
      className="custom-tabs mb-4"
      justify
    >

      {/* ================= CREATE EVENT TRIP ================= */}
      <Tab eventKey="create" title="Create Event Trip">

        <Card className="glass-card p-4">
          <h5 className="section-title mb-4">Create IV / Event Trip</h5>

          <Row className="g-4">

            <Col md={4}>
              <Form.Label>Bus</Form.Label>
              <Form.Select
                className="input-soft"
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

            <Col md={4}>
              <Form.Label>Driver</Form.Label>
              <Form.Select
                className="input-soft"
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

            <Col md={4}>
              <Form.Label>Destination</Form.Label>
              <Form.Control
                className="input-soft"
                type="text"
                placeholder="Enter destination"
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
              />
            </Col>

            <Col md={3}>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                className="input-soft"
                type="date"
                value={formData.fromDate}
                onChange={(e) =>
                  setFormData({ ...formData, fromDate: e.target.value })
                }
              />
            </Col>

            <Col md={3}>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                className="input-soft"
                type="date"
                value={formData.toDate}
                onChange={(e) =>
                  setFormData({ ...formData, toDate: e.target.value })
                }
              />
            </Col>

            <Col md={3}>
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                className="input-soft"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </Col>

            <Col md={3}>
              <Form.Label>End Time</Form.Label>
              <Form.Control
                className="input-soft"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </Col>

            <Col md={12}>
              <Form.Label>Reason / Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="input-soft"
                placeholder="Industrial Visit / Event / Competition"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </Col>

            <Col md={12}>
              <div className="d-flex align-items-center justify-content-between">
                <Form.Label className="mb-0">Event Stops (Optional)</Form.Label>
                <Button size="sm" className="primary-btn-sm" onClick={addEventStop}>
                  + Add Stop
                </Button>
              </div>
            </Col>

            {formData.eventStops.map((stop, index) => (
              <Col md={12} key={index}>
                <Row className="g-2 align-items-center">
                  <Col md={11}>
                    <Form.Control
                      className="input-soft"
                      placeholder="Stop Name"
                      value={stop.stopName}
                      onChange={(e) =>
                        updateEventStop(index, "stopName", e.target.value)
                      }
                    />
                  </Col>
                  <Col md={1}>
                    <Button
                      size="sm"
                      className="danger-btn-sm"
                      onClick={() => removeEventStop(index)}
                    >
                      X
                    </Button>
                  </Col>
                </Row>
              </Col>
            ))}

            <Col md={12} className="text-end">
              <Button
                className="primary-btn px-4"
                onClick={handleCreateTrip}
              >
                Create Event Trip
              </Button>
            </Col>

          </Row>
        </Card>
      </Tab>

      {/* ================= ACTIVE TRIPS ================= */}
      <Tab eventKey="active" title="Active Trips">

        <Card className="glass-card p-3">
          <Table responsive className="table-soft">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
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
                      : "-"}
                  </td>
                  <td>
                    <Button
                      className="neo-soft-btn neo-edit-btn me-2"
                      size="sm"
                      onClick={() => openEditModal(trip)}
                    >
                      Edit
                    </Button>
                    <Button
                      className="neo-soft-btn neo-delete-btn"
                      onClick={() =>
                        openDeleteConfirm("Delete this trip?", () => deleteActiveTrip(trip._id))
                      }
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Tab>

      {/* ================= HISTORY ================= */}
      <Tab eventKey="history" title="Trip History">

        <Card className="glass-card p-3">
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Form.Control
                className="input-soft"
                placeholder="Filter by Bus"
                value={historySearchBus}
                onChange={(e) => setHistorySearchBus(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                className="input-soft"
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                className="input-soft"
                type="date"
                value={historyFromDate}
                onChange={(e) => setHistoryFromDate(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Control
                className="input-soft"
                type="date"
                value={historyToDate}
                onChange={(e) => setHistoryToDate(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button
                className="danger-btn-sm w-100 h-100"
                onClick={() =>
                  openDeleteConfirm(
                    `Delete ${selectedHistoryTripIds.length} selected history trip(s)?`,
                    handleBulkDeleteHistory,
                  )
                }
                disabled={selectedHistoryTripIds.length === 0}
              >
                Delete Selected
              </Button>
            </Col>
          </Row>

          <Table responsive className="table-soft">
            <thead>
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    checked={
                      filteredHistoryTrips.length > 0 &&
                      filteredHistoryTrips.every((t) => selectedHistoryTripIds.includes(t._id))
                    }
                    onChange={(e) => handleSelectAllHistory(e.target.checked)}
                  />
                </th>
                <th>Bus</th>
                <th>Total Time</th>
                <th>Status</th>
                <th>Ended At</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistoryTrips.map((trip) => (
                <tr key={trip._id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedHistoryTripIds.includes(trip._id)}
                      onChange={() => toggleHistoryTripSelection(trip._id)}
                    />
                  </td>
                  <td>{trip.busNo}</td>

                  <td>
                    {trip.totalTime
                      ? `${trip.totalTime} mins`
                      : trip.startTime && trip.endTime
                      ? `${Math.round(
                          (new Date(trip.endTime) -
                            new Date(trip.startTime)) /
                            60000
                        )} mins`
                      : "-"}
                  </td>

                  <td>{getStatusBadge(trip.status)}</td>

                  <td>
                    {trip.endTime
                      ? new Date(trip.endTime).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    <Button
                      className="danger-btn-sm"
                      onClick={() =>
                        openDeleteConfirm("Delete this trip permanently?", () => deleteTrip(trip._id))
                      }
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>

          </Table>
        </Card>
      </Tab>

    </Tabs>

    <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Trip</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Bus</Form.Label>
            <Form.Select
              className="input-soft"
              value={editData.busNo}
              onChange={(e) => setEditData({ ...editData, busNo: e.target.value })}
            >
              <option value="">Select Bus</option>
              {buses.map((b) => (
                <option key={b._id} value={b.busNo}>
                  {b.busNo} - {b.routeName}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={6}>
            <Form.Label>Driver</Form.Label>
            <Form.Select
              className="input-soft"
              value={editData.driverId}
              onChange={(e) =>
                setEditData({ ...editData, driverId: e.target.value })
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

          <Col md={12}>
            <Form.Label>Destination</Form.Label>
            <Form.Control
              className="input-soft"
              type="text"
              value={editData.destination}
              onChange={(e) =>
                setEditData({ ...editData, destination: e.target.value })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>From Date</Form.Label>
            <Form.Control
              className="input-soft"
              type="date"
              value={editData.fromDate}
              onChange={(e) =>
                setEditData({ ...editData, fromDate: e.target.value })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>To Date</Form.Label>
            <Form.Control
              className="input-soft"
              type="date"
              value={editData.toDate}
              onChange={(e) =>
                setEditData({ ...editData, toDate: e.target.value })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>Start Time</Form.Label>
            <Form.Control
              className="input-soft"
              type="time"
              value={editData.startTime}
              onChange={(e) =>
                setEditData({ ...editData, startTime: e.target.value })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>End Time</Form.Label>
            <Form.Control
              className="input-soft"
              type="time"
              value={editData.endTime}
              onChange={(e) =>
                setEditData({ ...editData, endTime: e.target.value })
              }
            />
          </Col>

          <Col md={12}>
            <Form.Label>Reason / Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              className="input-soft"
              value={editData.reason}
              onChange={(e) =>
                setEditData({ ...editData, reason: e.target.value })
              }
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowEdit(false)}>
          Cancel
        </Button>
        <Button className="primary-btn" onClick={handleUpdateTrip}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>

    <Modal
      show={showDeleteConfirm}
      onHide={closeDeleteConfirm}
      centered
      dialogClassName="glass-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Confirm Delete</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{deleteConfirmMessage}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="secondary-btn"
          onClick={closeDeleteConfirm}
          disabled={deleteConfirmLoading}
        >
          Cancel
        </Button>
        <Button
          className="danger-btn"
          onClick={runDeleteConfirmAction}
          disabled={deleteConfirmLoading}
        >
          {deleteConfirmLoading ? "Deleting..." : "Delete"}
        </Button>
      </Modal.Footer>
    </Modal>

    <Modal
      show={missingStopModal}
      onHide={() => {
        setMissingStopModal(false);
        setPendingTripPayload(null);
      }}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Add Missing Stops</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          These stops are missing in Stop DB. Add coordinates to continue.
        </p>
        <div className="d-flex flex-column gap-3">
          {missingStopRows.map((row, idx) => (
            <Row key={`${row.stopName}-${idx}`} className="g-2">
              <Col md={5}>
                <Form.Control value={row.stopName} disabled />
              </Col>
              <Col md={3}>
                <Form.Control
                  type="number"
                  placeholder="Latitude"
                  value={row.lat}
                  onChange={(e) => {
                    const next = [...missingStopRows];
                    next[idx].lat = e.target.value;
                    setMissingStopRows(next);
                  }}
                />
              </Col>
              <Col md={4}>
                <Form.Control
                  type="number"
                  placeholder="Longitude"
                  value={row.lng}
                  onChange={(e) => {
                    const next = [...missingStopRows];
                    next[idx].lng = e.target.value;
                    setMissingStopRows(next);
                  }}
                />
              </Col>
            </Row>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => {
            setMissingStopModal(false);
            setPendingTripPayload(null);
          }}
        >
          Cancel
        </Button>
        <Button className="primary-btn" onClick={handleSaveMissingStops}>
          Save and Continue
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
);
}
