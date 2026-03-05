import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Modal,
  Row,
  Col,
  Badge,
  Alert,
  Card
} from "react-bootstrap";
import API from "../../api";
import "../../styles/manage-driver-soft.css";

export default function ManageDriver() {

  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);

  const [formData, setFormData] = useState({
    driverId: "",
    name: "",
    phone: "",
    licenseNo: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [manageModal, setManageModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [bulkDriverModal, setBulkDriverModal] = useState(false);
  const [bulkDriverText, setBulkDriverText] = useState("");
  const [bulkDriverError, setBulkDriverError] = useState("");
  const [bulkDriverSummary, setBulkDriverSummary] = useState("");
  const [bulkDriverLoading, setBulkDriverLoading] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState("selected");
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState("assigned");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const fetchDrivers = async () => {
    const res = await API.get("/admin/driver");
    setDrivers(res.data);
  };

  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  useEffect(() => {
    fetchDrivers();
    fetchBuses();
  }, []);

  const handleAddDriver = async () => {
    setError("");
    setMessage("");

    if (!formData.driverId || !formData.name) {
      setError("Driver ID and Name are required");
      return;
    }

    try {
      await API.post("/admin/driver", formData);

      setMessage("Driver added successfully (Default Password: 123456)");

      setFormData({
        driverId: "",
        name: "",
        phone: "",
        licenseNo: ""
      });

      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding driver");
    }
  };

  const openManage = (driver) => {
    setSelectedDriver(driver);
    setManageModal(true);
  };

  const handleUpdate = async () => {
    await API.put(
      `/admin/driver/${selectedDriver.driverId}`,
      selectedDriver
    );
    fetchDrivers();
  };

  const handleAssignBus = async () => {
    await API.put("/admin/assign-driver", {
      driverId: selectedDriver.driverId,
      busNo: selectedDriver.assignedBus
    });
    fetchDrivers();
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.trim().length < 4) {
      setError("New password must be at least 4 characters");
      return;
    }

    try {
      await API.put(
        `/admin/reset-driver-password/${selectedDriver.driverId}`,
        { newPassword: newPassword.trim() }
      );
      setNewPassword("");
      setError("");
      setMessage("Driver password reset successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset driver password");
      setMessage("");
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver?.driverId) return;
    const ok = window.confirm(`Delete driver ${selectedDriver.driverId}?`);
    if (!ok) return;

    try {
      await API.delete(
        `/admin/driver/${selectedDriver.driverId}`
      );
      setMessage(`Driver ${selectedDriver.driverId} deleted successfully`);
      setError("");
      setManageModal(false);
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting driver");
      setMessage("");
    }
  };

  const handleBulkDriverAdd = async () => {
    const lines = bulkDriverText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setBulkDriverError("Enter at least one driver row.");
      setBulkDriverSummary("");
      return;
    }

    setBulkDriverLoading(true);
    setBulkDriverError("");
    setBulkDriverSummary("");

    let created = 0;
    let failed = 0;
    const failedLines = [];

    for (let i = 0; i < lines.length; i += 1) {
      const parts = lines[i].split(",").map((p) => p.trim());
      const [driverId = "", name = "", phone = "", licenseNo = ""] = parts;

      if (!driverId || !name) {
        failed += 1;
        failedLines.push(i + 1);
        continue;
      }

      try {
        await API.post("/admin/driver", { driverId, name, phone, licenseNo });
        created += 1;
      } catch {
        failed += 1;
        failedLines.push(i + 1);
      }
    }

    if (created > 0) fetchDrivers();
    setBulkDriverSummary(`Created ${created} drivers.`);
    if (failed > 0) {
      setBulkDriverError(`Failed ${failed} rows. Line numbers: ${failedLines.join(", ")}`);
    }

    setBulkDriverLoading(false);
  };

  const toggleDriverSelection = (driverId) => {
    setSelectedDriverIds((prev) =>
      prev.includes(driverId)
        ? prev.filter((x) => x !== driverId)
        : [...prev, driverId],
    );
  };

  const handleSelectAllDrivers = (checked) => {
    if (!checked) {
      setSelectedDriverIds([]);
      return;
    }
    setSelectedDriverIds(drivers.map((d) => d.driverId));
  };

  const handleBulkDeleteDrivers = async () => {
    let payload = { mode: bulkDeleteMode };

    if (bulkDeleteMode === "selected") {
      if (selectedDriverIds.length === 0) {
        setError("Select at least one driver");
        setMessage("");
        return;
      }
      payload = { ...payload, driverIds: selectedDriverIds };
    } else if (bulkDeleteMode === "status") {
      payload = { ...payload, status: bulkDeleteStatus };
    }

    const ok = window.confirm("Delete drivers for selected bulk condition?");
    if (!ok) return;

    try {
      setBulkDeleteLoading(true);
      const res = await API.delete("/admin/drivers/bulk", { data: payload });
      setMessage(`${res.data.deletedCount || 0} driver(s) deleted successfully`);
      setError("");
      setSelectedDriverIds([]);
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to bulk delete drivers");
      setMessage("");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <div className="driver-page">

      <h3 className="page-title">Driver Management</h3>

      {/* ================= ADD DRIVER ================= */}
      <Card className="glass-card mb-4">
        <h5 className="section-title">Add New Driver</h5>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Row className="g-3">
          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="Driver ID"
              value={formData.driverId}
              onChange={(e) =>
                setFormData({ ...formData, driverId: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="License No"
              value={formData.licenseNo}
              onChange={(e) =>
                setFormData({ ...formData, licenseNo: e.target.value })
              }
            />
          </Col>
        </Row>

        <div className="d-flex gap-2 mt-4 flex-wrap">
          <Button className="primary-btn" onClick={handleAddDriver}>
            Add Driver
          </Button>
          <Button className="primary-btn" onClick={() => setBulkDriverModal(true)}>
            Add Bulk Drivers
          </Button>
        </div>
      </Card>

      <Card className="glass-card mb-4">
        <h5 className="section-title">Bulk Delete Drivers</h5>
        <Row className="g-3 align-items-end">
          <Col md={3}>
            <Form.Select
              className="input-soft"
              value={bulkDeleteMode}
              onChange={(e) => setBulkDeleteMode(e.target.value)}
            >
              <option value="selected">Selected</option>
              <option value="status">Assigned Status</option>
            </Form.Select>
          </Col>
          {bulkDeleteMode === "status" && (
            <Col md={3}>
              <Form.Select
                className="input-soft"
                value={bulkDeleteStatus}
                onChange={(e) => setBulkDeleteStatus(e.target.value)}
              >
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </Form.Select>
            </Col>
          )}
          <Col md={3}>
            <Button
              className="danger-btn"
              onClick={handleBulkDeleteDrivers}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? "Deleting..." : "Bulk Delete"}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="glass-card">
        <Table responsive hover className="table-soft">
          <thead>
            <tr>
              <th>
                <Form.Check
                  type="checkbox"
                  checked={
                    drivers.length > 0 &&
                    drivers.every((d) => selectedDriverIds.includes(d.driverId))
                  }
                  onChange={(e) => handleSelectAllDrivers(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Manage</th>
            </tr>
          </thead>

          <tbody>
            {drivers.map((d) => (
              <tr key={d._id}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedDriverIds.includes(d.driverId)}
                    onChange={() => toggleDriverSelection(d.driverId)}
                  />
                </td>
                <td>{d.driverId}</td>
                <td>{d.name}</td>
                <td>{d.phone}</td>
                <td>
                  {d.assignedBus ? (
                    <Badge bg="success">{d.assignedBus}</Badge>
                  ) : (
                    <Badge bg="secondary">Not Assigned</Badge>
                  )}
                </td>
                <td>
                  <Button
                    size="sm"
                    className="primary-btn"
                    onClick={() => openManage(d)}
                  >
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* ================= MODAL ================= */}
      <Modal
  show={manageModal}
  onHide={() => setManageModal(false)}
  size="lg"
  centered
  dialogClassName="glass-modal"
>
  <Modal.Header closeButton>
    <Modal.Title>Manage Driver</Modal.Title>
  </Modal.Header>

  <Modal.Body>
    {selectedDriver && (
      <div className="modal-body-wrapper">

        {/* ===== Driver Info Section ===== */}
        <div className="modal-section">
          <h6 className="section-heading">Driver Details</h6>

          <Row className="g-3">
            <Col md={6}>
              <Form.Label>ID</Form.Label>
              <Form.Control
                disabled
                value={selectedDriver.driverId}
                className="input-soft"
              />
            </Col>

            <Col md={6}>
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={selectedDriver.name}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    name: e.target.value
                  })
                }
                className="input-soft"
              />
            </Col>

            <Col md={6}>
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={selectedDriver.phone}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    phone: e.target.value
                  })
                }
                className="input-soft"
              />
            </Col>

            <Col md={6}>
              <Form.Label>License No</Form.Label>
              <Form.Control
                value={selectedDriver.licenseNo}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    licenseNo: e.target.value
                  })
                }
                className="input-soft"
              />
            </Col>
          </Row>
        </div>

        {/* ===== Bus Assignment Section ===== */}
        <div className="modal-section">
          <h6 className="section-heading">Bus Assignment</h6>

          <Row className="g-3 align-items-end">
            <Col md={8}>
              <Form.Select
                className="input-soft"
                value={selectedDriver.assignedBus || ""}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    assignedBus: e.target.value
                  })
                }
              >
                <option value="">Select Bus</option>
                {buses.map((b) => (
                  <option key={b._id} value={b.busNo}>
                    {b.busNo}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Button
                className="primary-btn w-100"
                onClick={handleAssignBus}
              >
                Save Assignment
              </Button>
            </Col>
          </Row>
        </div>

        {/* ===== Password Section ===== */}
        <div className="modal-section">
          <h6 className="section-heading">Security</h6>

          <Row className="g-3 align-items-end">
            <Col md={8}>
              <Form.Control
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                className="input-soft"
              />
            </Col>

            <Col md={4}>
              <Button
                className="warning-btn w-100"
                onClick={handleResetPassword}
              >
                Reset Password
              </Button>
            </Col>
          </Row>
        </div>

        {/* ===== Danger Section ===== */}
        <div className="modal-section danger-section">
          <Button
            className="danger-btn"
            onClick={handleDelete}
          >
            Delete Driver
          </Button>
        </div>

      </div>
    )}
  </Modal.Body>

  <Modal.Footer>
    <Button
      className="secondary-btn"
      onClick={() => setManageModal(false)}
    >
      Close
    </Button>

    <Button
      className="primary-btn"
      onClick={handleUpdate}
    >
      Save Changes
    </Button>
  </Modal.Footer>
</Modal>

      <Modal
        show={bulkDriverModal}
        onHide={() => setBulkDriverModal(false)}
        centered
        dialogClassName="glass-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Drivers</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Paste CSV rows (one per line)</Form.Label>
            <Form.Control
              as="textarea"
              rows={7}
              className="input-soft"
              value={bulkDriverText}
              onChange={(e) => setBulkDriverText(e.target.value)}
              placeholder={"D101,Ravi,9876543210,LIC123\nD102,Anu,9123456789,LIC456"}
            />
            <div className="mt-2 text-muted">
              Format: <code>driverId,name,phone,licenseNo</code>
            </div>
          </Form.Group>
          {bulkDriverError && <Alert variant="warning" className="mt-3 mb-2">{bulkDriverError}</Alert>}
          {bulkDriverSummary && <Alert variant="success" className="mt-3 mb-2">{bulkDriverSummary}</Alert>}
          <Button
            className="primary-btn mt-2"
            onClick={handleBulkDriverAdd}
            disabled={bulkDriverLoading}
          >
            {bulkDriverLoading ? "Adding..." : "Add Bulk Drivers"}
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
