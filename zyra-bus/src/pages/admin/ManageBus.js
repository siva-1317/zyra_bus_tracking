import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Modal,
  Badge,
  Row,
  Col,
  Alert,
  Card,
} from "react-bootstrap";
import API from "../../api";

export default function ManageBus() {
  const [buses, setBuses] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [filterTripStatus, setFilterTripStatus] = useState("");

  const [formData, setFormData] = useState({
    busNo: "",
    routeName: "",
    totalSeats: "",
    tripStartMorning: "",
    tripEndMorning: "",
    tripStartEvening: "",
    tripEndEvening: "",
    stops: [],
  });

  const [manageModal, setManageModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);

  /* ================= FETCH ================= */
  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  /* ================= ADD BUS ================= */
  const handleAddBus = async () => {
    try {
      await API.post("/admin/bus", formData);

      setMessage("Bus added successfully");
      setError("");

      setFormData({
        busNo: "",
        routeName: "",
        totalSeats: "",
        tripStartMorning: "",
        tripEndMorning: "",
        tripStartEvening: "",
        tripEndEvening: "",
        stops: [],
      });

      fetchBuses();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding bus");
      setMessage("");
    }
  };

  /* ================= FILTERING ================= */
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch =
      bus.busNo?.toLowerCase().includes(search.toLowerCase()) ||
      bus.routeName?.toLowerCase().includes(search.toLowerCase());

    const matchesDriver =
      filterDriver === "" ||
      (filterDriver === "assigned" && bus.driverId) ||
      (filterDriver === "unassigned" && !bus.driverId);

    const availableSeats = bus.availableSeats ?? bus.totalSeats ?? 0;

    const matchesCapacity =
      filterCapacity === "" ||
      (filterCapacity === "full" && availableSeats === 0) ||
      (filterCapacity === "available" && availableSeats > 0);

    const matchesTrip =
      filterTripStatus === "" || bus.tripStatus === filterTripStatus;

    return matchesSearch && matchesDriver && matchesCapacity && matchesTrip;
  });

  /* ================= MANAGE ================= */

  const openManage = (bus) => {
    setSelectedBus({ ...bus, stops: bus.stops || [] });
    setManageModal(true);
  };

  const handleUpdate = async () => {
    await API.put(`/admin/bus/${selectedBus.busNo}`, selectedBus);
    fetchBuses();
    setManageModal(false);
  };

  const handleDelete = async () => {
    await API.delete(`/admin/bus/${selectedBus.busNo}`);
    fetchBuses();
    setManageModal(false);
  };

  const addStop = () => {
    setSelectedBus({
      ...selectedBus,
      stops: [
        ...selectedBus.stops,
        {
          stopName: "",
          lat: "",
          lng: "",
          morningTime: "",
          eveningTime: "",
        },
      ],
    });
  };

  const updateStop = (index, field, value) => {
    const updatedStops = [...selectedBus.stops];
    updatedStops[index][field] = value;

    setSelectedBus({ ...selectedBus, stops: updatedStops });
  };

  const removeStop = (index) => {
    const updatedStops = selectedBus.stops.filter((_, i) => i !== index);
    setSelectedBus({ ...selectedBus, stops: updatedStops });
  };

  /* ================= UI ================= */

  return (
    <div>
      <h3 className="mb-4">Bus Management</h3>

      {/* ================= ADD BUS ================= */}
      <Card className="p-4 mb-4 shadow-sm">
        <h5 className="mb-3">Add New Bus</h5>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        {/* Row 1 */}
        <Row className="g-3">
          <Col md={3}>
            <Form.Control
              placeholder="Bus No"
              value={formData.busNo}
              onChange={(e) =>
                setFormData({ ...formData, busNo: e.target.value })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Control
              placeholder="Route Name"
              value={formData.routeName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  routeName: e.target.value,
                })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              type="number"
              placeholder="Total Seats"
              value={formData.totalSeats}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalSeats: e.target.value,
                })
              }
            />
          </Col>
        </Row>

        {/* Morning */}
        <Row className="g-3 mt-3">
          <Col md={6}>
            <Form.Label>Trip Start (Morning)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripStartMorning}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tripStartMorning: e.target.value,
                })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>Trip End (Morning)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripEndMorning}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tripEndMorning: e.target.value,
                })
              }
            />
          </Col>
        </Row>

        {/* Evening */}
        <Row className="g-3 mt-3">
          <Col md={6}>
            <Form.Label>Trip Start (Evening)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripStartEvening}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tripStartEvening: e.target.value,
                })
              }
            />
          </Col>

          <Col md={6}>
            <Form.Label>Trip End (Evening)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripEndEvening}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tripEndEvening: e.target.value,
                })
              }
            />
          </Col>
        </Row>

        <Button className="w-100 mt-4" onClick={handleAddBus}>
          Add Bus
        </Button>
      </Card>

      {/* ================= FILTER ================= */}
      <Card className="p-3 mb-3">
        <Row className="g-3">
          <Col md={3}>
            <Form.Control
              placeholder="Search Bus No / Route"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>

          <Col md={3}>
            <Form.Select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
            >
              <option value="">All Drivers</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </Form.Select>
          </Col>

          <Col md={3}>
            <Form.Select
              value={filterCapacity}
              onChange={(e) => setFilterCapacity(e.target.value)}
            >
              <option value="">All Capacity</option>
              <option value="full">Full</option>
              <option value="available">Seats Available</option>
            </Form.Select>
          </Col>

          <Col md={3}>
            <Form.Select
              value={filterTripStatus}
              onChange={(e) => setFilterTripStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="not-started">Not Started</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Form.Select>
          </Col>
        </Row>
      </Card>

      {/* ================= TABLE ================= */}
      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Bus No</th>
            <th>Route</th>
            <th>Capacity</th>
            <th>Driver</th>
            <th>Stops</th>
            <th>Manage</th>
          </tr>
        </thead>

        <tbody>
          {filteredBuses.map((bus) => (
            <tr key={bus._id}>
              <td>{bus.busNo}</td>
              <td>{bus.routeName}</td>
              <td>
                {(bus.availableSeats ?? bus.totalSeats) || 0}/{bus.totalSeats}
              </td>
              <td>
                {bus.driverId ? (
                  <Badge bg="success">{bus.driverId}</Badge>
                ) : (
                  <Badge bg="secondary">No Driver</Badge>
                )}
              </td>
              <td>{bus.stops?.length || 0}</td>
              <td>
                <Button size="sm" onClick={() => openManage(bus)}>
                  Manage
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ================= MODAL ================= */}
      <Modal show={manageModal} onHide={() => setManageModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Bus</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedBus && (
            <>
              <Form.Label>Route Name</Form.Label>
              <Form.Control
                value={selectedBus.routeName}
                onChange={(e) =>
                  setSelectedBus({
                    ...selectedBus,
                    routeName: e.target.value,
                  })
                }
                className="mb-3"
              />

              <Form.Label>Total Seats</Form.Label>
              <Form.Control
                type="number"
                value={selectedBus.totalSeats}
                onChange={(e) =>
                  setSelectedBus({
                    ...selectedBus,
                    totalSeats: e.target.value,
                  })
                }
                className="mb-3"
              />

              <hr />
              <h6>Stops</h6>

              <Button
                size="sm"
                variant="secondary"
                className="mb-3"
                onClick={addStop}
              >
                + Add Stop
              </Button>

              {selectedBus.stops.map((stop, index) => (
                <Card key={index} className="mb-2 p-3 shadow-sm">
                  <Row className="g-2">
                    {/* Stop Name */}
                    <Col md={3}>
                      <Form.Control
                        placeholder="Stop Name"
                        value={stop.stopName}
                        onChange={(e) =>
                          updateStop(index, "stopName", e.target.value)
                        }
                      />
                    </Col>

                    {/* Latitude */}
                    <Col md={2}>
                      <Form.Control
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={stop.lat}
                        onChange={(e) =>
                          updateStop(index, "lat", e.target.value)
                        }
                      />
                    </Col>

                    {/* Longitude */}
                    <Col md={2}>
                      <Form.Control
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={stop.lng}
                        onChange={(e) =>
                          updateStop(index, "lng", e.target.value)
                        }
                      />
                    </Col>

                    {/* Morning Time */}
                    <Col md={2}>
                      <Form.Control
                        type="time"
                        value={stop.morningTime}
                        onChange={(e) =>
                          updateStop(index, "morningTime", e.target.value)
                        }
                      />
                    </Col>

                    {/* Evening Time */}
                    <Col md={2}>
                      <Form.Control
                        type="time"
                        value={stop.eveningTime}
                        onChange={(e) =>
                          updateStop(index, "eveningTime", e.target.value)
                        }
                      />
                    </Col>

                    {/* Delete */}
                    <Col md={1}>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeStop(index)}
                      >
                        X
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}

              <hr />
              <Button variant="danger" onClick={handleDelete}>
                Delete Bus
              </Button>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setManageModal(false)}>
            Close
          </Button>

          <Button variant="success" onClick={handleUpdate}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
