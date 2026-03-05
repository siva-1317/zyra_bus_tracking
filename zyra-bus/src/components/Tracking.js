import { useEffect, useState } from "react";
import { Container, Card, Badge, Spinner } from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import API from "../api";

export default function TrackingPage({ busNo }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTracking = async () => {
    try {
      const res = await API.get(`/trip/${busNo}/tracking`);
      setTracking(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!tracking || tracking.message === "No active trip") {
    return (
      <Container className="mt-4 text-center">
        <h5>No active trip running</h5>
      </Container>
    );
  }

  const isGPS = tracking.trackingMode === "gps";

  return (
    <Container className="mt-4">
      <Card className="shadow p-3">

        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>Bus Tracking - {busNo}</h4>

          {isGPS ? (
            <Badge bg="success">Live GPS Tracking</Badge>
          ) : (
            <Badge bg="warning">Estimated (GPS Lost)</Badge>
          )}
        </div>

        {/* GPS MODE */}
        {isGPS ? (
          <MapContainer
            center={[
              tracking.busLocation.lat,
              tracking.busLocation.lng
            ]}
            zoom={14}
            style={{ height: "500px", width: "100%" }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Bus Marker */}
            <Marker
              position={[
                tracking.busLocation.lat,
                tracking.busLocation.lng
              ]}
            >
              <Popup>Live Bus Location</Popup>
            </Marker>

            {/* Stops */}
            {tracking.eta.map((stopData, index) => (
              <Marker
                key={index}
                position={[
                  stopData.stop.lat,
                  stopData.stop.lng
                ]}
              >
                <Popup>{stopData.stop.name}</Popup>
              </Marker>
            ))}

            {/* Route Line */}
            <Polyline
              positions={tracking.eta.map(e => [
                e.stop.lat,
                e.stop.lng
              ])}
            />
          </MapContainer>
        ) : (
          /* TIME-BASED FALLBACK */
          <div className="timeline-container">
            <div className="timeline-line"></div>

            <div
              className="timeline-progress"
              style={{
                height: `${tracking.progressPercent}%`
              }}
            ></div>

            {tracking.eta.map((stopData, index) => (
              <div key={index} className="timeline-item">
                <div className="time">
                  {new Date(stopData.eta).toLocaleTimeString()}
                </div>

                <div className={`circle ${stopData.status}`}></div>

                <div className="stop-name">
                  {stopData.stop.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Container>
  );
}