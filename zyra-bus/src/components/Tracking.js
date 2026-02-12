import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet-routing-machine";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

import students from "../data/students.json";
import busData from "../data/bus.json";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// ---------------- FIX DEFAULT MARKERS ----------------
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---------------- LOCAL CACHE (primary) ----------------
const cityCache = {
  "BIT College": [11.4986, 77.2743],
  Coimbatore: [11.0168, 76.9558],
  Sulur: [11.0266, 77.1257],
  Avinashi: [11.1929, 77.268],
  Gopichettipalayam: [11.4549, 77.4423],
  Nambiyur: [11.359, 77.321],
};

// ---------------- SAFE GEOCODER ----------------
async function geocode(place) {
  // First use local cache
  if (cityCache[place]) return cityCache[place];

  // Fallback to API (if allowed)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        place
      )}`
    );
    const data = await res.json();

    if (data.length) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      cityCache[place] = coords; // cache it
      return coords;
    }
  } catch (e) {
    console.warn("Geocode blocked:", place);
  }

  return null;
}

// ---------------- ROUTING COMPONENT ----------------
function Routing({ points, setInfo, setRouteCoords }) {
  const map = useMap();
  const ref = useRef(null);

  useEffect(() => {
    if (!map || !points.length || ref.current) return;

    ref.current = L.Routing.control({
      waypoints: points.map(p => L.latLng(p[0], p[1])),
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: {
        styles: [{ color: "red", weight: 5 }],
      },
    })
      .on("routesfound", e => {
        const r = e.routes[0];

        setInfo({
          distance: (r.summary.totalDistance / 1000).toFixed(2),
          time: Math.round(r.summary.totalTime / 60),
        });

        setRouteCoords(r.coordinates);
      })
      .addTo(map);
  }, [map, points, setInfo, setRouteCoords]);

  return null;
}

// ---------------- MAIN ----------------
export default function Tracking() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user.role.toLowerCase();

  const [points, setPoints] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [busPos, setBusPos] = useState(null);
  const [info, setInfo] = useState({ distance: 0, time: 0 });
  const [nextStop, setNextStop] = useState("");
  const [progress, setProgress] = useState(0);

  // -------- LOAD ROUTE BASED ON ROLE --------
  useEffect(() => {
    async function load() {
      // STUDENT → student.json
      if (role === "student") {
        const student = students.students.find(s => s.id === user.id);
        const bus = busData.busses.find(b => b.busNo === student.busNo);

        const studentLoc = await geocode(student.location);
        const college = await geocode(bus.route[0]);

        if (studentLoc && college) {
          setPoints([studentLoc, college]);
        }
      }

      // DRIVER → bus.json
      if (role === "driver") {
        const bus = busData.busses.find(b => b.busNo === user.busNo);

        const geo = [];
        for (let city of bus.route) {
          const p = await geocode(city);
          if (p) geo.push(p);
        }

        setPoints(geo);
        setNextStop(bus.route[1]);
      }
    }

    load();
  }, [user, role]);

  // -------- DRIVER GPS (publish) --------
  useEffect(() => {
    if (role !== "driver") return;

    const watch = navigator.geolocation.watchPosition(pos => {
      const p = [pos.coords.latitude, pos.coords.longitude];
      localStorage.setItem("liveBus", JSON.stringify(p));
      setBusPos(p);
    });

    return () => navigator.geolocation.clearWatch(watch);
  }, [role]);

  // -------- STUDENT READ BUS --------
  useEffect(() => {
    if (role !== "student") return;

    const i = setInterval(() => {
      const live = JSON.parse(localStorage.getItem("liveBus"));
      if (live) setBusPos(live);
    }, 3000);

    return () => clearInterval(i);
  }, [role]);

  // -------- PROGRESS BAR --------
  useEffect(() => {
    if (!busPos || !routeCoords.length) return;

    const idx = routeCoords.findIndex(
      p =>
        Math.abs(p.lat - busPos[0]) < 0.0005 &&
        Math.abs(p.lng - busPos[1]) < 0.0005
    );

    if (idx !== -1) {
      setProgress(Math.round((idx / routeCoords.length) * 100));
    }
  }, [busPos, routeCoords]);

  if (!points.length) return <p>Loading route...</p>;

  return (
    <div className="card shadow p-3">

      <h5>Tracking ({role})</h5>

      <p>
        Distance: {info.distance} km | ETA: {info.time} mins
      </p>

      {role === "driver" && <p><b>Next Stop:</b> {nextStop}</p>}

      <div className="progress mb-2">
        <div className="progress-bar bg-success" style={{ width: `${progress}%` }}>
          {progress}%
        </div>
      </div>

      <MapContainer center={points[0]} zoom={10} style={{ height: "400px" }}>

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Routing
          points={points}
          setInfo={setInfo}
          setRouteCoords={setRouteCoords}
        />

        {/* Start + Stops */}
        {points.map((p, i) => (
          <Marker key={i} position={p}>
            <Popup>
              {i === 0
                ? "Start"
                : i === points.length - 1
                ? "Destination"
                : `Stop ${i}`}
            </Popup>
          </Marker>
        ))}

        {/* Live Bus */}
        {busPos && (
          <Marker position={busPos}>
            <Popup>Live Bus</Popup>
          </Marker>
        )}

      </MapContainer>

    </div>
  );
}
