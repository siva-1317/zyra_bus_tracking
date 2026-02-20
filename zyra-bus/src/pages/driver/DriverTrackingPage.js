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

          const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${trip.destinationLng},${trip.destinationLat}?overview=full&geometries=geojson`;

          const res = await fetch(url);
          const data = await res.json();

          if (data.routes?.length > 0) {
            route = data.routes[0].geometry.coordinates.map((c) => [
              c[1],
              c[0],
            ]);
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

  return (
    <Container className="mt-4">
      <Card className="shadow-lg p-4 mb-4">
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

        <div className="mt-3 d-flex gap-2">
          {status === "planned" && (
            <Button variant="success" onClick={startTrip}>
              Start Trip
            </Button>
          )}

          {status === "running" && (
            <>
              <Button variant="warning" onClick={pauseTrip}>
                Pause
              </Button>
              <Button variant="danger" onClick={endTrip}>
                End
              </Button>
            </>
          )}

          {status === "paused" && (
            <>
              <Button variant="primary" onClick={resumeTrip}>
                Resume
              </Button>
              <Button variant="danger" onClick={endTrip}>
                End
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="shadow-lg p-3">
        <MapContainer
          center={
            routeCoords.length
              ? routeCoords[0]
              : [bus.stops[0].lat, bus.stops[0].lng]
          }
          zoom={14}
          style={{ height: "500px", width: "100%" }}
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
    </Container>
  );
}