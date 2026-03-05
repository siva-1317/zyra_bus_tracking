import { Fragment, useEffect, useState } from "react";
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
  Accordion,
} from "react-bootstrap";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import API from "../../api";
import "../../styles/manage-bus-soft.css";

export default function ManageBus() {
  const fileBaseUrl = (API.defaults.baseURL || "").replace(/\/api$/, "");
  const [buses, setBuses] = useState([]);
  const [liveBuses, setLiveBuses] = useState([]);
  const [routeCoordsByBus, setRouteCoordsByBus] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [filterTripStatus, setFilterTripStatus] = useState("");
  const [filterLiveStatus, setFilterLiveStatus] = useState("all");
  const [filterLiveBusNo, setFilterLiveBusNo] = useState("");

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
  const [complaints, setComplaints] = useState([]);
  const [complaintModal, setComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("in-review");
  const [reviewAction, setReviewAction] = useState("need-repair");
  const [reviewRemark, setReviewRemark] = useState("");
  const [fromBusNo, setFromBusNo] = useState("");
  const [toBusNo, setToBusNo] = useState("");
  const [alternativeBuses, setAlternativeBuses] = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [bulkStopsText, setBulkStopsText] = useState("");
  const [bulkStopsError, setBulkStopsError] = useState("");
  const [bulkStopsMessage, setBulkStopsMessage] = useState("");
  const [draggedStopIndex, setDraggedStopIndex] = useState(null);
  const [dragOverStopIndex, setDragOverStopIndex] = useState(null);

  const fetchBuses = async () => {
    const res = await API.get("/admin/bus");
    setBuses(res.data);
  };

  const fetchLiveBuses = async () => {
    const res = await API.get("/admin/bus-live");
    setLiveBuses(res.data || []);
  };

  const fetchComplaints = async () => {
    const res = await API.get("/admin/bus-complaints");
    setComplaints(res.data || []);
  };

  const fetchAlternativeBuses = async (fromBus) => {
    if (!fromBus) {
      setAlternativeBuses([]);
      return;
    }
    const res = await API.get("/admin/alternative-buses", {
      params: { fromBusNo: fromBus },
    });
    setAlternativeBuses(res.data || []);
  };

  useEffect(() => {
    fetchBuses();
    fetchLiveBuses();
    fetchComplaints();

    const interval = setInterval(() => {
      fetchLiveBuses();
      fetchComplaints();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAlternativeBuses(fromBusNo);
    setToBusNo("");
  }, [fromBusNo]);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

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

  const openManage = (bus) => {
    const normalizedStops = (bus.stops || []).map((stop) => ({
      stopName: stop.stopName || "",
      lat: stop.lat ?? "",
      lng: stop.lng ?? "",
      morningTime: stop.morningTime || "",
      eveningTime: stop.eveningTime || "",
    }));

    setSelectedBus({
      ...bus,
      routeName: bus.routeName || "",
      totalSeats: bus.totalSeats ?? "",
      tripStartMorning: bus.tripStartMorning || "",
      tripEndMorning: bus.tripEndMorning || "",
      tripStartEvening: bus.tripStartEvening || "",
      tripEndEvening: bus.tripEndEvening || "",
      conditionStatus: bus.conditionStatus || "good",
      stops: normalizedStops,
    });
    setBulkStopsText("");
    setBulkStopsError("");
    setBulkStopsMessage("");
    setDraggedStopIndex(null);
    setDragOverStopIndex(null);
    setManageModal(true);
  };

const handleUpdate = async () => {
  const updatedData = {
    routeName: selectedBus.routeName,
    totalSeats: Number(selectedBus.totalSeats),
    tripStartMorning: selectedBus.tripStartMorning || "",
    tripEndMorning: selectedBus.tripEndMorning || "",
    tripStartEvening: selectedBus.tripStartEvening || "",
    tripEndEvening: selectedBus.tripEndEvening || "",
    stops: selectedBus.stops,
    conditionStatus: selectedBus.conditionStatus || "good",
  };

  try {
    await API.put(`/admin/bus/${selectedBus.busNo}`, updatedData);
    setMessage(`Bus ${selectedBus.busNo} updated successfully`);
    setError("");
    fetchBuses();
    setManageModal(false);
  } catch (err) {
    setError(err.response?.data?.message || "Failed to update bus");
    setMessage("");
  }
};

  const handleDelete = async () => {
    if (!selectedBus?.busNo) return;
    const ok = window.confirm(`Delete bus ${selectedBus.busNo}?`);
    if (!ok) return;

    try {
      await API.delete(`/admin/bus/${selectedBus.busNo}`);
      setMessage(`Bus ${selectedBus.busNo} deleted successfully`);
      setError("");
      fetchBuses();
      setManageModal(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete bus");
      setMessage("");
    }
  };

  const openComplaintReview = (complaint) => {
    setSelectedComplaint(complaint);
    setReviewStatus(complaint.status || "in-review");
    setReviewAction(complaint.adminAction || "need-repair");
    setReviewRemark(complaint.adminRemark || "");
    setComplaintModal(true);
  };

  const handleComplaintReview = async () => {
    if (!selectedComplaint) return;
    await API.put(`/admin/bus-complaints/${selectedComplaint._id}/review`, {
      status: reviewStatus,
      adminAction: reviewAction,
      adminRemark: reviewRemark,
    });
    setComplaintModal(false);
    setSelectedComplaint(null);
    fetchComplaints();
    fetchBuses();
  };

  const handleSwapBus = async () => {
    if (!fromBusNo || !toBusNo) {
      setError("Select both From Bus and Alternative Bus");
      return;
    }
    try {
      setSwapLoading(true);
      await API.put("/admin/swap-bus", { fromBusNo, toBusNo });
      setMessage(`Bus changed successfully: ${fromBusNo} -> ${toBusNo}`);
      setError("");
      setFromBusNo("");
      setToBusNo("");
      setAlternativeBuses([]);
      fetchBuses();
      fetchComplaints();
      fetchLiveBuses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change bus");
      setMessage("");
    } finally {
      setSwapLoading(false);
    }
  };

  const addStop = () => {
    setSelectedBus({
      ...selectedBus,
      stops: [
        ...selectedBus.stops,
        { stopName: "", lat: "", lng: "", morningTime: "", eveningTime: "" },
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

  const moveStop = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const stops = [...(selectedBus?.stops || [])];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= stops.length ||
      toIndex >= stops.length
    ) {
      return;
    }
    const [moved] = stops.splice(fromIndex, 1);
    stops.splice(toIndex, 0, moved);
    setSelectedBus({ ...selectedBus, stops });
  };

  const moveStopUp = (index) => moveStop(index, index - 1);
  const moveStopDown = (index) => moveStop(index, index + 1);

  const handleBulkAddStops = () => {
    if (!selectedBus) return;
    const lines = bulkStopsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setBulkStopsError("Enter at least one stop line.");
      setBulkStopsMessage("");
      return;
    }

    const parsedStops = [];
    const invalidLines = [];

    lines.forEach((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 3) {
        invalidLines.push(idx + 1);
        return;
      }
      const [stopName, lat, lng, morningTimeRaw, eveningTimeRaw] = parts;
      if (!stopName) {
        invalidLines.push(idx + 1);
        return;
      }
      const morningTime = morningTimeRaw || "00:00";
      const eveningTime = eveningTimeRaw || "00:00";
      parsedStops.push({
        stopName,
        lat,
        lng,
        morningTime,
        eveningTime,
      });
    });

    if (!parsedStops.length) {
      setBulkStopsError("No valid stop rows found. Use: stopName,lat,lng[,morningTime,eveningTime]");
      setBulkStopsMessage("");
      return;
    }

    setSelectedBus({
      ...selectedBus,
      stops: [...(selectedBus.stops || []), ...parsedStops],
    });

    if (invalidLines.length > 0) {
      setBulkStopsError(`Added ${parsedStops.length} stops. Skipped invalid lines: ${invalidLines.join(", ")}`);
      setBulkStopsMessage("");
    } else {
      setBulkStopsError("");
      setBulkStopsMessage(`${parsedStops.length} stops added.`);
    }
    setBulkStopsText("");
  };

  const filteredLiveBuses = liveBuses.filter((bus) => {
    const matchBus =
      filterLiveBusNo === "" || bus.busNo === filterLiveBusNo;
    const matchStatus =
      filterLiveStatus === "all" || bus.status === filterLiveStatus;
    return matchBus && matchStatus;
  });

  const statusByBus = liveBuses.reduce((acc, b) => {
    acc[b.busNo] = b.status;
    return acc;
  }, {});

  const colorPalette = [
    "#ff6b6b",
    "#4dabf7",
    "#51cf66",
    "#ffd43b",
    "#845ef7",
    "#ff922b",
    "#20c997",
    "#e64980",
    "#339af0",
    "#94d82d",
  ];

  const filteredPathBuses = buses.filter((bus) => {
    const matchBus =
      filterLiveBusNo === "" || bus.busNo === filterLiveBusNo;
    const status = statusByBus[bus.busNo] || "not-running";
    const matchStatus =
      filterLiveStatus === "all" || status === filterLiveStatus;
    return matchBus && matchStatus;
  });

  useEffect(() => {
    const loadRoutes = async () => {
      const busesToLoad = filteredPathBuses.filter((bus) => {
        if (routeCoordsByBus[bus.busNo]) return false;
        const stopsWithCoords = (bus.stops || []).filter(
          (s) => s.lat && s.lng,
        );
        return stopsWithCoords.length >= 2;
      });

      for (const bus of busesToLoad) {
        try {
          let route = [];
          const stops = (bus.stops || []).filter((s) => s.lat && s.lng);

          for (let i = 0; i < stops.length - 1; i++) {
            const start = stops[i];
            const end = stops[i + 1];

            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.routes?.length > 0) {
              const segment = data.routes[0].geometry.coordinates.map((c) => [
                c[1],
                c[0],
              ]);
              route = [...route, ...segment];
            }
          }

          if (route.length > 0) {
            setRouteCoordsByBus((prev) => ({
              ...prev,
              [bus.busNo]: route,
            }));
          }
        } catch {
          // ignore route load failure for this bus
        }
      }
    };

    loadRoutes();
  }, [
    filteredPathBuses.map((b) => b.busNo).join("|"),
    routeCoordsByBus,
  ]);

  const mapCenter = (() => {
    const withLocation = filteredLiveBuses.find(
      (b) => b.location && b.location.lat && b.location.lng,
    );
    if (withLocation) return [withLocation.location.lat, withLocation.location.lng];
    return [11.4983, 77.2426]; // Bannari Amman Institute of Technology
  })();

  return (
    <div className="manage-bus-container">

      <h3 className="page-title">Bus Management</h3>

      {/* ADD BUS */}
      <Card className="glass-card mb-4">
        <h5 className="section-title">Add New Bus</h5>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Row className="g-3">
          <Col xs={12} md={3}>
            <Form.Control
              placeholder="Bus No"
              value={formData.busNo}
              onChange={(e) =>
                setFormData({ ...formData, busNo: e.target.value })
              }
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Control
              placeholder="Route Name"
              value={formData.routeName}
              onChange={(e) =>
                setFormData({ ...formData, routeName: e.target.value })
              }
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Control
              type="number"
              placeholder="Total Seats"
              value={formData.totalSeats}
              onChange={(e) =>
                setFormData({ ...formData, totalSeats: e.target.value })
              }
            />
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12} md={3}>
            <Form.Label className="form-label-soft">Morning Start (HH:mm)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripStartMorning}
              onChange={(e) =>
                setFormData({ ...formData, tripStartMorning: e.target.value })
              }
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="form-label-soft">Morning End (HH:mm)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripEndMorning}
              onChange={(e) =>
                setFormData({ ...formData, tripEndMorning: e.target.value })
              }
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="form-label-soft">Evening Start (HH:mm)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripStartEvening}
              onChange={(e) =>
                setFormData({ ...formData, tripStartEvening: e.target.value })
              }
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="form-label-soft">Evening End (HH:mm)</Form.Label>
            <Form.Control
              type="time"
              value={formData.tripEndEvening}
              onChange={(e) =>
                setFormData({ ...formData, tripEndEvening: e.target.value })
              }
            />
          </Col>
        </Row>

        <Button className="primary-btn mt-4 w-100" onClick={handleAddBus}>
          Add Bus
        </Button>
      </Card>

      <Card className="glass-card mb-4">
        <h5 className="section-title">Alternative Bus Selection</h5>
        <Row className="g-3">
          <Col xs={12} md={5}>
            <Form.Label>From Bus</Form.Label>
            <Form.Select
              className="input-soft"
              value={fromBusNo}
              onChange={(e) => setFromBusNo(e.target.value)}
            >
              <option value="">Select From Bus</option>
              {buses.map((bus) => (
                <option key={bus._id} value={bus.busNo}>
                  {bus.busNo} - {bus.routeName}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} md={5}>
            <Form.Label>To Bus (Not Assigned Any Work)</Form.Label>
            <Form.Select
              className="input-soft"
              value={toBusNo}
              onChange={(e) => setToBusNo(e.target.value)}
              disabled={!fromBusNo}
            >
              <option value="">Select Alternative Bus</option>
              {alternativeBuses.map((bus) => (
                <option key={bus._id} value={bus.busNo}>
                  {bus.busNo} - {bus.routeName}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} md={2} className="d-flex align-items-end">
            <Button
              className="primary-btn w-100"
              onClick={handleSwapBus}
              disabled={swapLoading}
            >
              {swapLoading ? "Updating..." : "BUS Swap"}
            </Button>
          </Col>
        </Row>

      </Card>

      {/* FILTER */}
      <Card className="glass-card mb-4">
        <Row className="g-3">
          <Col xs={12} md={3}>
            <Form.Control
              placeholder="Search Bus No / Route"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}>
              <option value="">All Drivers</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </Form.Select>
          </Col>

          <Col xs={12} md={3}>
            <Form.Select value={filterCapacity} onChange={(e) => setFilterCapacity(e.target.value)}>
              <option value="">All Capacity</option>
              <option value="full">Full</option>
              <option value="available">Seats Available</option>
            </Form.Select>
          </Col>

          <Col xs={12} md={3}>
            <Form.Select value={filterTripStatus} onChange={(e) => setFilterTripStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="not-started">Not Started</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Form.Select>
          </Col>
        </Row>
      </Card>

      {/* TABLE */}
      <Card className="glass-card">
        <div className="table-wrapper">
          <Table hover responsive>
            <thead>
              <tr>
                <th>Bus No</th>
                <th>Route</th>
                <th>Condition</th>
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
                    {bus.conditionStatus === "need-repair" ? (
                      <Badge bg="danger">Need Repair</Badge>
                    ) : (
                      <Badge bg="success">Good</Badge>
                    )}
                  </td>
                  <td>
                    {(bus.availableSeats ?? bus.totalSeats) || 0}/{bus.totalSeats}
                  </td>
                  <td>
                    {bus.driverId ? (
                      <Badge className="badge-success-soft">{bus.driverId}</Badge>
                    ) : (
                      <Badge className="badge-secondary-soft">No Driver</Badge>
                    )}
                  </td>
                  <td>{bus.stops?.length || 0}</td>
                  <td>
                    <Button className="primary-btn-sm" onClick={() => openManage(bus)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card className="glass-card mt-4">
        <h5 className="section-title">Bus Condition Complaints</h5>
        <div className="table-wrapper">
          <Table hover responsive>
            <thead>
              <tr>
                <th>Bus</th>
                <th>Driver</th>
                <th>Issue</th>
                <th>Status</th>
                <th>Photos</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    No complaints found
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c._id}>
                    <td>{c.busNo}</td>
                    <td>{c.driverId?.driverId || "-"}</td>
                    <td>{c.complaintType}</td>
                    <td>
                      <Badge className="badge-secondary-soft">{c.status}</Badge>
                    </td>
                    <td>
                      {(c.photos || []).length === 0 ? (
                        "-"
                      ) : (
                        <div className="d-flex gap-2 flex-wrap">
                          {c.photos.slice(0, 3).map((p) => (
                            <a key={p} href={`${fileBaseUrl}${p}`} target="_blank" rel="noreferrer">
                              Photo
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <Button className="primary-btn-sm" onClick={() => openComplaintReview(c)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* LIVE MAP */}
      <Card className="glass-card mt-4">
        <div className="map-header">
          <h5 className="section-title mb-0">Live Bus Map</h5>
          <div className="map-filters">
            <Form.Select
              value={filterLiveBusNo}
              onChange={(e) => setFilterLiveBusNo(e.target.value)}
              className="input-soft"
            >
              <option value="">All Buses</option>
              {liveBuses.map((b) => (
                <option key={b.busNo} value={b.busNo}>
                  {b.busNo}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              value={filterLiveStatus}
              onChange={(e) => setFilterLiveStatus(e.target.value)}
              className="input-soft"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="not-running">Not Running</option>
            </Form.Select>
          </div>
        </div>

        <div className="live-map">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {filteredPathBuses.map((bus, index) => {
              const routePath = routeCoordsByBus[bus.busNo];
              const stopsWithCoords = (bus.stops || [])
                .filter((s) => s.lat && s.lng)
                .map((s) => [Number(s.lat), Number(s.lng)]);
              const path = routePath && routePath.length > 1 ? routePath : stopsWithCoords;

              if (path.length < 2) return null;

              const color = colorPalette[index % colorPalette.length];
              const startPoint = path[0];
              const endPoint = path[path.length - 1];
              const startStop = (bus.stops || []).find((s) => s.lat && s.lng);
              const endStop = [...(bus.stops || [])].reverse().find((s) => s.lat && s.lng);

              return (
                <Fragment key={`path-${bus.busNo}`}>
                  <Polyline positions={path} color={color} weight={5} opacity={0.75}>
                    <Tooltip permanent direction="center" className="bus-path-label">
                      {bus.busNo}
                    </Tooltip>
                  </Polyline>
                  <Marker key={`start-${bus.busNo}`} position={startPoint}>
                    <Popup>
                      <div className="popup-content">
                        <div><strong>{bus.busNo}</strong> - Start Point</div>
                        <div>Stop: {startStop?.stopName || "Start Stop"}</div>
                        <Button
                          size="sm"
                          className="primary-btn-sm mt-2"
                          onClick={() => {
                            const selected = buses.find((b) => b.busNo === bus.busNo);
                            if (selected) openManage(selected);
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker key={`end-${bus.busNo}`} position={endPoint}>
                    <Popup>
                      <div className="popup-content">
                        <div><strong>{bus.busNo}</strong> - End Point</div>
                        <div>Stop: {endStop?.stopName || "End Stop"}</div>
                        <Button
                          size="sm"
                          className="primary-btn-sm mt-2"
                          onClick={() => {
                            const selected = buses.find((b) => b.busNo === bus.busNo);
                            if (selected) openManage(selected);
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              );
            })}

            {filteredLiveBuses.map((bus) => {
              if (!bus.location || !bus.location.lat || !bus.location.lng) {
                return null;
              }

              return (
                <Marker
                  key={bus.busNo}
                  position={[bus.location.lat, bus.location.lng]}
                >
                  <Popup>
                    <div className="popup-content">
                      <div><strong>{bus.busNo}</strong> - {bus.routeName}</div>
                      <div>Status: {bus.status}</div>
                      <div>Driver: {bus.driverId || "Unassigned"}</div>
                      <Button
                        size="sm"
                        className="primary-btn-sm mt-2"
                        onClick={() => {
                          const selected = buses.find((b) => b.busNo === bus.busNo);
                          if (selected) openManage(selected);
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </Card>

      {/* MODAL */}
      <Modal
  show={manageModal}
  onHide={() => setManageModal(false)}
  size="lg"
  centered
  dialogClassName="glass-modal"
>

  <Modal.Header closeButton className="glass-modal-header">
    <Modal.Title className="modal-title-soft">
      Manage Bus
    </Modal.Title>
  </Modal.Header>

  <Modal.Body className="glass-modal-body">
    {selectedBus && (
      <Accordion defaultActiveKey={["0"]} alwaysOpen>
        <Accordion.Item eventKey="0">
          <Accordion.Header>Bus Details</Accordion.Header>
          <Accordion.Body>
            <Form.Label className="form-label-soft">Bus No</Form.Label>
            <Form.Control
              value={selectedBus.busNo || ""}
              disabled
              className="mb-3 input-soft"
            />

            <Form.Label className="form-label-soft">Route Name</Form.Label>
            <Form.Control
              value={selectedBus.routeName}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  routeName: e.target.value,
                })
              }
              className="mb-3 input-soft"
            />

            <Form.Label className="form-label-soft">Total Seats</Form.Label>
            <Form.Control
              type="number"
              value={selectedBus.totalSeats}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  totalSeats: e.target.value,
                })
              }
              className="mb-4 input-soft"
            />

            <Form.Label className="form-label-soft">Condition Status</Form.Label>
            <Form.Select
              value={selectedBus.conditionStatus || "good"}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  conditionStatus: e.target.value,
                })
              }
              className="mb-4 input-soft"
            >
              <option value="good">Good</option>
              <option value="need-repair">Need Repair</option>
            </Form.Select>

            <Form.Label className="form-label-soft">Morning Start Time</Form.Label>
            <Form.Control
              type="time"
              value={selectedBus.tripStartMorning || ""}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  tripStartMorning: e.target.value,
                })
              }
              className="mb-3 input-soft"
            />

            <Form.Label className="form-label-soft">Morning End Time</Form.Label>
            <Form.Control
              type="time"
              value={selectedBus.tripEndMorning || ""}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  tripEndMorning: e.target.value,
                })
              }
              className="mb-3 input-soft"
            />

            <Form.Label className="form-label-soft">Evening Start Time</Form.Label>
            <Form.Control
              type="time"
              value={selectedBus.tripStartEvening || ""}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  tripStartEvening: e.target.value,
                })
              }
              className="mb-3 input-soft"
            />

            <Form.Label className="form-label-soft">Evening End Time</Form.Label>
            <Form.Control
              type="time"
              value={selectedBus.tripEndEvening || ""}
              onChange={(e) =>
                setSelectedBus({
                  ...selectedBus,
                  tripEndEvening: e.target.value,
                })
              }
              className="mb-2 input-soft"
            />
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>Add Stops</Accordion.Header>
          <Accordion.Body>
            <div className="d-flex gap-2 mb-3">
              <Button
                size="sm"
                className="add-stop-btn"
                onClick={addStop}
              >
                + Add Stop
              </Button>
            </div>

            <div className="bulk-stop-box mb-2">
              <Form.Label className="form-label-soft">Add More Stops (CSV-like, one per line)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={bulkStopsText}
                onChange={(e) => setBulkStopsText(e.target.value)}
                className="input-soft"
                placeholder={"Stop Name,12.9716,77.5946,08:10,17:10\nSecond Stop,12.9750,77.6010,08:20,17:20"}
              />
              <div className="bulk-stop-help">
                Format: <code>stopName,lat,lng[,morningTime,eveningTime]</code>. If times are skipped, default <code>00:00</code> is used.
              </div>
              {bulkStopsError && <Alert variant="warning" className="mt-2 mb-2">{bulkStopsError}</Alert>}
              {bulkStopsMessage && <Alert variant="success" className="mt-2 mb-2">{bulkStopsMessage}</Alert>}
              <Button size="sm" className="add-stop-btn mt-2" onClick={handleBulkAddStops}>
                Add Stops From Text
              </Button>
            </div>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>Stops ({selectedBus.stops.length})</Accordion.Header>
          <Accordion.Body>
            {selectedBus.stops.map((stop, index) => (
              <Card
                key={index}
                className={`stop-glass-card mb-3 ${dragOverStopIndex === index ? "stop-drag-over" : ""}`}
                draggable
                onDragStart={(e) => {
                  if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName)) {
                    e.preventDefault();
                    return;
                  }
                  setDraggedStopIndex(index);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStopIndex !== index) setDragOverStopIndex(index);
                }}
                onDragLeave={() => setDragOverStopIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedStopIndex !== null) moveStop(draggedStopIndex, index);
                  setDraggedStopIndex(null);
                  setDragOverStopIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedStopIndex(null);
                  setDragOverStopIndex(null);
                }}
              >
                <Row className="g-2 align-items-center">
                  <Col xs={12} md={1}>
                    <div className="stop-index-chip">#{index + 1}</div>
                  </Col>

                  <Col xs={12} md={3}>
                    <Form.Control
                      placeholder="Stop Name"
                      value={stop.stopName}
                      onChange={(e) => updateStop(index, "stopName", e.target.value)}
                      className="input-soft"
                    />
                  </Col>

                  <Col xs={6} md={2}>
                    <Form.Control
                      type="number"
                      placeholder="Latitude"
                      value={stop.lat}
                      onChange={(e) => updateStop(index, "lat", e.target.value)}
                      className="input-soft"
                    />
                  </Col>

                  <Col xs={6} md={2}>
                    <Form.Control
                      type="number"
                      placeholder="Longitude"
                      value={stop.lng}
                      onChange={(e) => updateStop(index, "lng", e.target.value)}
                      className="input-soft"
                    />
                  </Col>

                  <Col xs={6} md={2}>
                    <Form.Control
                      type="time"
                      value={stop.morningTime}
                      onChange={(e) => updateStop(index, "morningTime", e.target.value)}
                      className="input-soft"
                    />
                  </Col>

                  <Col xs={6} md={2}>
                    <Form.Control
                      type="time"
                      value={stop.eveningTime}
                      onChange={(e) => updateStop(index, "eveningTime", e.target.value)}
                      className="input-soft"
                    />
                  </Col>

                  <Col xs={12} md={2}>
                    <div className="d-flex gap-1 justify-content-md-end">
                      <Button
                        className="reorder-stop-btn"
                        size="sm"
                        onClick={() => moveStopUp(index)}
                        disabled={index === 0}
                      >
                        Up
                      </Button>
                      <Button
                        className="reorder-stop-btn"
                        size="sm"
                        onClick={() => moveStopDown(index)}
                        disabled={index === selectedBus.stops.length - 1}
                      >
                        Down
                      </Button>
                      <Button
                        className="delete-stop-btn"
                        size="sm"
                        onClick={() => removeStop(index)}
                      >
                        X
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Card>
            ))}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="3">
          <Accordion.Header>Other</Accordion.Header>
          <Accordion.Body>
            <Button className="delete-bus-btn" onClick={handleDelete}>
              Delete Bus
            </Button>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    )}
  </Modal.Body>

  <Modal.Footer className="glass-modal-footer">
    <Button
      className="secondary-btn-soft"
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
        show={complaintModal}
        onHide={() => setComplaintModal(false)}
        centered
        dialogClassName="glass-modal"
      >
        <Modal.Header closeButton className="glass-modal-header">
          <Modal.Title className="modal-title-soft">Review Complaint</Modal.Title>
        </Modal.Header>
        <Modal.Body className="glass-modal-body">
          {selectedComplaint && (
            <>
              <p><strong>Bus:</strong> {selectedComplaint.busNo}</p>
              <p><strong>Issue:</strong> {selectedComplaint.complaintType}</p>
              <p><strong>Description:</strong> {selectedComplaint.description || "-"}</p>

              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  className="input-soft"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <option value="in-review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Bus Action</Form.Label>
                <Form.Select
                  className="input-soft"
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value)}
                >
                  <option value="need-repair">Need Repair</option>
                  <option value="resolved">Resolved / Fixed</option>
                  <option value="no-issue">No Issue</option>
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label>Admin Remark</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  className="input-soft"
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="glass-modal-footer">
          <Button className="secondary-btn-soft" onClick={() => setComplaintModal(false)}>
            Close
          </Button>
          <Button className="primary-btn" onClick={handleComplaintReview}>
            Save Review
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
