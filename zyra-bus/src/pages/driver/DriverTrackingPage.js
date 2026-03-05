import { useEffect, useRef, useState } from "react";
import {
  Container,
  Card,
  Button,
  Badge,
  Row,
  Col,
  Alert,
} from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import API from "../../api";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import busImage from "../../assets/bus.png";
import "../../styles/driver-dashboard.css"

/* ================= FIX MARKER ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

/* ================= ICONS ================= */
const stopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const busIcon = new L.Icon({
  iconUrl: busImage,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/* ================= AUTO CENTER ================= */
function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 15);
    }
  }, [location, map]);
  return null;
}

export default function DriverTrackingPage() {
  const [trip, setTrip] = useState(null);
  const [bus, setBus] = useState(null);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("loading");
  const [routeCoords, setRouteCoords] = useState([]);
  const [etaData, setEtaData] = useState(null);
  const [now, setNow] = useState(new Date());

  const watchRef = useRef(null);
  const previousLocation = useRef(null);
  const animationRef = useRef(null);

  /* ================= FETCH ACTIVE TRIP ================= */
  const loadActiveTrip = async () => {
    try {
      const res = await API.get("/driver/active-trip");

      setTrip(res.data.trip);
      setBus(res.data.bus);

      if (res.data.trip) {
        setStatus(res.data.trip.status);

        if (res.data.trip.status === "running") {
          startGPS(res.data.trip._id);
        }
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  useEffect(() => {
    loadActiveTrip();
  }, []);

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      if (watchRef.current)
        navigator.geolocation.clearWatch(watchRef.current);
      if (animationRef.current)
        cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ================= ANIMATION ================= */
  const animateMovement = (newLoc) => {
    if (!previousLocation.current) {
      previousLocation.current = newLoc;
      setLocation(newLoc);
      return;
    }

    const start = previousLocation.current;
    const end = newLoc;
    const duration = 800;
    const startTime = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      setLocation({ lat, lng });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousLocation.current = newLoc;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  /* ================= ROUTE LOGIC ================= */
  useEffect(() => {
    if (!bus || !trip) return;

    const fetchRoute = async () => {
      try {
        let route = [];

        if (trip.tripType === "event" && trip.destinationLat) {
          const start = bus.stops[0];
          const eventStops = (trip.eventStops || []).filter(
            (s) => s.lat && s.lng,
          );

          const points = [
            { lat: start.lat, lng: start.lng },
            ...eventStops.map((s) => ({ lat: s.lat, lng: s.lng })),
            { lat: trip.destinationLat, lng: trip.destinationLng },
          ];

          for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];
            const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
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
        } else {
          for (let i = 0; i < bus.stops.length - 1; i++) {
            const start = bus.stops[i];
            const end = bus.stops[i + 1];

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
        }

        setRouteCoords(route);
      } catch {
        console.log("Route load failed");
      }
    };

    fetchRoute();
  }, [trip, bus]);

  const fetchEta = async () => {
    if (!bus?.busNo) return;
    try {
      const res = await API.get(`/driver/trip/${bus.busNo}/eta`);
      if (res.data?.message === "No active trip") {
        setEtaData(null);
      } else {
        setEtaData(res.data);
      }
    } catch {
      setEtaData(null);
    }
  };

  useEffect(() => {
    if (!bus) return;
    if (status === "running" || status === "paused") {
      fetchEta();
      const interval = setInterval(fetchEta, 15000);
      return () => clearInterval(interval);
    }
    setEtaData(null);
  }, [bus, status]);

  /* ================= GPS ================= */
  const startGPS = (id) => {
    if (!navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        animateMovement(newLoc);

        await API.post(`/driver/trip/${id}/location`, newLoc);
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );
  };

  const stopGPS = () => {
    if (watchRef.current)
      navigator.geolocation.clearWatch(watchRef.current);
  };

  /* ================= CONTROLS ================= */
  const startTrip = async () => {
    await API.post(`/driver/trip/${trip._id}/start`);
    setStatus("running");
    startGPS(trip._id);
  };

  const pauseTrip = async () => {
    await API.post(`/driver/trip/${trip._id}/pause`);
    stopGPS();
    setStatus("paused");
  };

  const resumeTrip = async () => {
    await API.post(`/driver/trip/${trip._id}/resume`);
    setStatus("running");
    startGPS(trip._id);
  };

  const endTrip = async () => {
    await API.post(`/driver/trip/${trip._id}/end`);
    stopGPS();
    previousLocation.current = null;
    setLocation(null);
    await loadActiveTrip(); // 🔥 Auto load next trip
  };

  /* ================= STATUS COLOR ================= */
  const getBadgeColor = () => {
    switch (status) {
      case "running":
        return "success";
      case "paused":
        return "warning";
      case "planned":
        return "primary";
      case "completed":
        return "secondary";
      default:
        return "info";
    }
  };

  if (!bus) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">No bus assigned.</Alert>
      </Container>
    );
  }

  const isMorning = now.getHours() < 12;

  const convertToMinutes = (timeValue) => {
    if (!timeValue) return null;
    if (typeof timeValue === "number") return timeValue;
    if (typeof timeValue === "string") {
      const time = timeValue.trim();
      const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      const parts = time.split(":");
      if (parts.length === 2) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (!isNaN(hours) && !isNaN(minutes)) {
          return hours * 60 + minutes;
        }
      }
    }
    return null;
  };

  const scheduledStops = (bus.stops || []).map((stop) => {
    const time = isMorning ? stop.morningTime : stop.eveningTime;
    return {
      name: stop.stopName,
      time,
      minutes: convertToMinutes(time),
      lat: stop.lat,
      lng: stop.lng,
    };
  });

  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  let currentStopIndex = -1;
  if (scheduledStops?.length) {
    for (let i = 0; i < scheduledStops.length; i++) {
      if (scheduledStops[i].minutes !== null && currentTimeMinutes >= scheduledStops[i].minutes) {
        currentStopIndex = i;
      }
    }
  }

  return (
    <div className="tracking-page">
      <Card className="soft-card mb-3">
        <Row>
          <Col md={8}>
            <h4>Driver Tracking - {bus.busNo}</h4>
          </Col>
          <Col md={4} className="text-end">
            <Badge bg={getBadgeColor()}>
              {status?.toUpperCase()}
            </Badge>
          </Col>
        </Row>

        <div className="mt-3 d-flex gap-2 flex-wrap">
          {status === "planned" && (
            <Button className="soft-btn" onClick={startTrip}>
              Start Trip
            </Button>
          )}

          {status === "running" && (
            <>
              <Button className="soft-btn-sm" onClick={pauseTrip}>
                Pause
              </Button>
              <Button className="soft-btn-danger" onClick={endTrip}>
                End
              </Button>
            </>
          )}

          {status === "paused" && (
            <>
              <Button className="soft-btn" onClick={resumeTrip}>
                Resume
              </Button>
              <Button className="soft-btn-danger" onClick={endTrip}>
                End
              </Button>
            </>
          )}
        </div>
      </Card>

      {trip?.tripType === "event" && (
        <Card className="soft-card mb-3">
          <h5>Assigned Duty - Special Trip (IV/Event)</h5>
          <Row className="mt-2">
            <Col md={6}>
              <p><strong>Destination:</strong> {trip.destination || "-"}</p>
              <p><strong>Reason:</strong> {trip.reason || "-"}</p>
            </Col>
            <Col md={6}>
              <p><strong>From:</strong> {trip.fromDate ? new Date(trip.fromDate).toLocaleDateString() : "-"}</p>
              <p><strong>To:</strong> {trip.toDate ? new Date(trip.toDate).toLocaleDateString() : "-"}</p>
              <p><strong>Start/End:</strong> {trip.startTime || "-"} / {trip.endTime || "-"}</p>
            </Col>
          </Row>
          <small className="text-muted">
            After completing this special trip, the regular route will be loaded automatically.
          </small>
        </Card>
      )}

      <Card className="soft-card">
        <MapContainer
          center={
            routeCoords.length
              ? routeCoords[0]
              : [bus.stops[0].lat, bus.stops[0].lng]
          }
          zoom={14}
          style={{ height: "500px", width: "100%", borderRadius: 16 }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="blue" />
          )}

          {trip?.tripType !== "event" &&
            bus.stops.map((stop, i) => (
              <Marker key={i} position={[stop.lat, stop.lng]} icon={stopIcon}>
                <Popup>{stop.stopName}</Popup>
              </Marker>
            ))}

          {trip?.tripType === "event" &&
            (trip.eventStops || []).map((stop, i) => (
              <Marker key={`event-${i}`} position={[stop.lat, stop.lng]} icon={stopIcon}>
                <Popup>{stop.stopName || "Event Stop"}</Popup>
              </Marker>
            ))}

          {trip?.tripType === "event" && trip.destinationLat && trip.destinationLng && (
            <Marker
              position={[trip.destinationLat, trip.destinationLng]}
              icon={stopIcon}
            >
              <Popup>{trip.destination || "Destination"}</Popup>
            </Marker>
          )}

          {location && (
            <>
              <Marker position={[location.lat, location.lng]} icon={busIcon}>
                <Popup>Live Bus</Popup>
              </Marker>
              <RecenterMap location={location} />
            </>
          )}
        </MapContainer>
      </Card>

      <Card className="soft-card mt-3 schedule-card">
        <Row className="align-items-center schedule-header">
          <Col md={8}>
            <div className="schedule-title">
              <span className="schedule-kicker">Bus Schedule</span>
              <h5 className="mb-0">Stops • {isMorning ? "Morning" : "Evening"}</h5>
            </div>
          </Col>
          <Col md={4} className="text-end">
            <span className="schedule-chip">{now.toLocaleTimeString()}</span>
          </Col>
        </Row>

        {etaData?.progressPercent !== undefined && (
          <div className="mt-3 schedule-progress">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${etaData.progressPercent}%` }}
              />
            </div>
            <small className="progress-text">
              {Math.round(etaData.progressPercent)}% completed
            </small>
          </div>
        )}

        <div className="mt-4 tracking-schedule">
          <div className="tracking-timeline">
            <div className="tracking-bar">
              <div
                className="tracking-progress"
                style={{
                  width: `${etaData?.progressPercent ?? 0}%`,
                }}
              />
            </div>

            <div className="tracking-stops">
              {scheduledStops.map((stop, index) => {
                const isDone = etaData
                  ? etaData.eta?.[index]?.status === "completed"
                  : index <= currentStopIndex;
                const isCurrent = etaData
                  ? etaData.eta?.[index]?.status === "current"
                  : index === currentStopIndex;
                const etaTime = etaData?.eta?.[index]?.eta;
                const timeText = etaTime
                  ? new Date(etaTime).toLocaleTimeString()
                  : stop.time || "-";

                return (
                  <div key={index} className="tracking-stop">
                    <div
                      className={`tracking-dot ${isCurrent ? "is-current" : isDone ? "is-done" : ""}`}
                    />
                    <div className="tracking-label">
                      <small>
                        <strong>{stop.name}</strong>
                      </small>
                      <br />
                      <small>{timeText}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
