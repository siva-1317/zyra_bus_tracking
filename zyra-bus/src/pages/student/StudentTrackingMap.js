import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Col, Row, Badge } from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../../api";
import busImage from "../../assets/bus.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

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

function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.lat && location?.lng) {
      map.setView([location.lat, location.lng], 15);
    }
  }, [location, map]);
  return null;
}

async function fetchOsrmRoute(points) {
  const coords = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) continue;

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.length > 0) {
      const segment = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      coords.push(...segment);
    }
  }
  return coords;
}

export default function StudentTrackingMap({ busNo, bus }) {
  const [tracking, setTracking] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef(null);

  const mapPoints = useMemo(() => {
    if (!bus) return [];
    const baseStops = (bus.stops || [])
      .map((s) => ({
        stopName: s.stopName || s.name,
        lat: s.lat,
        lng: s.lng,
      }))
      .filter((s) => s.lat && s.lng);

    const trip = tracking?.trip || null;
    if (trip?.tripType === "event" && trip.destinationLat && trip.destinationLng) {
      const eventStops = (trip.eventStops || []).filter((s) => s.lat && s.lng);
      return [
        ...(baseStops.length ? [baseStops[0]] : []),
        ...eventStops,
        { stopName: trip.destination || "Destination", lat: trip.destinationLat, lng: trip.destinationLng },
      ];
    }

    return baseStops;
  }, [bus, tracking]);

  const mapCenter = useMemo(() => {
    if (busLocation?.lat && busLocation?.lng) return [busLocation.lat, busLocation.lng];
    if (mapPoints.length > 0) return [mapPoints[0].lat, mapPoints[0].lng];
    return [20.5937, 78.9629];
  }, [busLocation, mapPoints]);

  const loadTracking = useCallback(async () => {
    if (!busNo) return;
    try {
      setLoading(true);
      const res = await API.get(`/student/trip/${busNo}/tracking`);
      setTracking(res.data || null);
      setBusLocation(res.data?.busLocation || null);
    } catch {
      setTracking(null);
      setBusLocation(null);
    } finally {
      setLoading(false);
    }
  }, [busNo]);

  useEffect(() => {
    loadTracking();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadTracking, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadTracking]);

  const routeKey = useMemo(
    () => mapPoints.map((p) => `${p.lat},${p.lng}`).join("|"),
    [mapPoints],
  );

  useEffect(() => {
    let mounted = true;
    const loadRoute = async () => {
      if (!mapPoints.length) {
        setRouteCoords([]);
        return;
      }
      try {
        const coords = await fetchOsrmRoute(mapPoints);
        if (mounted) setRouteCoords(coords);
      } catch {
        if (mounted) setRouteCoords([]);
      }
    };
    loadRoute();
    return () => {
      mounted = false;
    };
  }, [mapPoints, routeKey]);

  const badgeText = (() => {
    const message = tracking?.message;
    if (message) return message;
    const status = tracking?.trip?.status;
    if (!status) return "Idle";
    return status.toUpperCase();
  })();

  const badgeVariant = (() => {
    const status = tracking?.trip?.status;
    if (status === "running") return "success";
    if (status === "paused") return "warning";
    if (status === "planned") return "info";
    return "secondary";
  })();

  if (!busNo || !bus) {
    return (
      <Card className="mt-4 p-3 neo-card">
        <Card.Body>
          <h5 className="section-title">Live Map</h5>
          <hr className="divider-soft" />
          <p className="mb-0">Assign a bus to view live tracking.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-3 neo-card">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={8}>
            <h5 className="section-title mb-0">Live Map</h5>
            <small className="text-muted">Bus {busNo}</small>
          </Col>
          <Col md={4} className="text-end">
            <Badge bg={badgeVariant}>{loading ? "LOADING" : badgeText}</Badge>
          </Col>
        </Row>
        <hr className="divider-soft" />

        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: "420px", width: "100%", borderRadius: 16 }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#2d7ff9" />}

          {mapPoints.map((stop, i) => (
            <Marker key={i} position={[stop.lat, stop.lng]} icon={stopIcon}>
              <Popup>{stop.stopName || "Stop"}</Popup>
            </Marker>
          ))}

          {busLocation?.lat && busLocation?.lng && (
            <>
              <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon}>
                <Popup>Live Bus</Popup>
              </Marker>
              <RecenterMap location={busLocation} />
            </>
          )}
        </MapContainer>
      </Card.Body>
    </Card>
  );
}
