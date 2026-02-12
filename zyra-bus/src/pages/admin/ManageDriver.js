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

  // 🔹 Fetch Drivers
  const fetchDrivers = async () => {
    const res = await API.get("/admin/driver");
    setDrivers(res.data);
  };

  // 🔹 Fetch Buses
  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  useEffect(() => {
    fetchDrivers();
    fetchBuses();
  }, []);

  // 🔹 Add Driver
  const handleAddDriver = async () => {
    setError("");
    setMessage("");

    if (!formData.driverId || !formData.name) {
      setError("Driver ID and Name are required");
      return;
    }

    try {
      const res = await API.post("/admin/driver", formData);

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

  // 🔹 Open Manage Modal
  const openManage = (driver) => {
    setSelectedDriver(driver);
    setManageModal(true);
  };

  // 🔹 Update Driver
  const handleUpdate = async () => {
    await API.put(
      `/admin/driver/${selectedDriver.driverId}`,
      selectedDriver
    );
    alert("Driver updated");
    fetchDrivers();
  };

  // 🔹 Assign Bus
  const handleAssignBus = async () => {
    await API.put("/admin/assign-driver", {
      driverId: selectedDriver.driverId,
      busNo: selectedDriver.assignedBus
    });
    alert("Bus assigned");
    fetchDrivers();
  };

  // 🔹 Reset Password
  const handleResetPassword = async () => {
    await API.put(
      `/admin/reset-driver-password/${selectedDriver.driverId}`,
      { newPassword }
    );
    alert("Password reset successfully");
    setNewPassword("");
  };

  // 🔹 Delete Driver
  const handleDelete = async () => {
    await API.delete(
      `/admin/driver/${selectedDriver.driverId}`
    );
    alert("Driver deleted");
    setManageModal(false);
    fetchDrivers();
  };

  return (
    <div>
      <h3>Driver Management</h3>

      {/* 🔥 ADD DRIVER CARD */}
      <Card className="p-3 mb-4">
        <h5>Add New Driver</h5>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Row>
          <Col md={3}>
            <Form.Control
              placeholder="Driver ID"
              value={formData.driverId}
              onChange={(e) =>
                setFormData({ ...formData, driverId: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              placeholder="License No"
              value={formData.licenseNo}
              onChange={(e) =>
                setFormData({ ...formData, licenseNo: e.target.value })
              }
            />
          </Col>
        </Row>

        <Button className="mt-3" onClick={handleAddDriver}>
          Add Driver
        </Button>
      </Card>

      {/* 🔥 DRIVER TABLE */}
      <Table bordered hover responsive>
        <thead>
          <tr>
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
                  onClick={() => openManage(d)}
                >
                  Manage
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 🔥 MANAGE MODAL */}
      <Modal
        show={manageModal}
        onHide={() => setManageModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Manage Driver</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedDriver && (
            <>
              <Form.Label>Driver ID</Form.Label>
              <Form.Control
                value={selectedDriver.driverId}
                disabled
                className="mb-2"
              />

              <Form.Label>Name</Form.Label>
              <Form.Control
                value={selectedDriver.name}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    name: e.target.value
                  })
                }
                className="mb-2"
              />

              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={selectedDriver.phone}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    phone: e.target.value
                  })
                }
                className="mb-2"
              />

              <Form.Label>License No</Form.Label>
              <Form.Control
                value={selectedDriver.licenseNo}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    licenseNo: e.target.value
                  })
                }
                className="mb-3"
              />

              <Form.Label>Assign Bus</Form.Label>
              <Form.Select
                value={selectedDriver.assignedBus || ""}
                onChange={(e) =>
                  setSelectedDriver({
                    ...selectedDriver,
                    assignedBus: e.target.value
                  })
                }
                className="mb-2"
              >
                <option value="">Select Bus</option>
                {buses.map((b) => (
                  <option key={b._id} value={b.busNo}>
                    {b.busNo}
                  </option>
                ))}
              </Form.Select>

              <Button
                variant="info"
                className="mb-3"
                onClick={handleAssignBus}
              >
                Save Bus Assignment
              </Button>

              <hr />

              <Form.Control
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                className="mb-2"
              />

              <Button
                variant="warning"
                className="mb-3"
                onClick={handleResetPassword}
              >
                Reset Password
              </Button>

              <hr />

              <Button
                variant="danger"
                onClick={handleDelete}
              >
                Delete Driver
              </Button>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setManageModal(false)}
          >
            Close
          </Button>

          <Button
            variant="success"
            onClick={handleUpdate}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
