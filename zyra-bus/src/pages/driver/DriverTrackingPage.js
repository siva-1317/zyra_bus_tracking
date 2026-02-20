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

/* ================= FIX DEFAULT MARKER ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

/* ================= CUSTOM ICONS ================= */
const stopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/0/308.png"|| busImage ,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/* ================= AUTO CENTER MAP ================= */
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

  /* ================= ANIMATE BUS MOVEMENT ================= */
 const animateMovement = (newLoc) => {
  if (!previousLocation.current) {
    previousLocation.current = newLoc;
    setLocation(newLoc);
    return;
  }

  // Stop previous animation
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
  }

  const start = previousLocation.current;
  const end = newLoc;

  const duration = 1000; // 1 second smooth movement
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

  /* ================= FETCH ACTIVE DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
  }, []);

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
      if (watchRef.current)
        navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  /* ================= FETCH ROAD ROUTE ================= */
  useEffect(() => {
    if (!bus || !bus.stops?.length) return;

    const fetchRoute = async () => {
      try {
        let fullRoute = [];

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
            fullRoute = [...fullRoute, ...segment];
          }
        }

        setRouteCoords(fullRoute);
      } catch {
        console.log("Route fetch failed");
      }
    };

    fetchRoute();
  }, [bus]);

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

        try {
          await API.post(`/driver/trip/${id}/location`, newLoc);
        } catch (err) {
          console.log("Location send failed");
        }
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );
  };

  const stopGPS = () => {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
  };

  /* ================= TRIP CONTROLS ================= */
  const startTrip = async () => {
    try {
      let id = trip?._id;

      if (!id) {
        const res = await API.post("/driver/create-trip");
        id = res.data._id;
        setTrip(res.data);
      }

      await API.post(`/driver/trip/${id}/start`);
      setStatus("running");
      startGPS(id);
    } catch (err) {
      console.log(err);
    }
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
    setTrip(null);
    setStatus("idle");
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
            <Badge
              bg={
                status === "running"
                  ? "success"
                  : status === "paused"
                  ? "warning"
                  : "info"
              }
            >
              {status.toUpperCase()}
            </Badge>
          </Col>
        </Row>

        <div className="mt-3 d-flex gap-2">
          {status === "idle" && (
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
          center={[bus.stops[0].lat, bus.stops[0].lng]}
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

          {bus.stops.map((stop, i) => (
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