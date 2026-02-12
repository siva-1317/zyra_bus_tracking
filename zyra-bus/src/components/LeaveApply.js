import React, { useEffect, useState } from "react";
import { Card, Form, Badge } from "react-bootstrap";

import initialLeaves from "../data/driverLeaves.json";

export default function LeaveApply() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState([]);

  // Load existing leaves (JSON + localStorage)
 useEffect(() => {
  const stored = JSON.parse(localStorage.getItem("driverLeaves")) || [];

  const seed = initialLeaves?.leaves || [];

  const merged = [...seed, ...stored];

  setHistory(merged.filter(l => l.driverId === user.id));
}, [user.id]);

  const handleSubmit = () => {
    if (!fromDate || !toDate || !reason) {
      alert("Please fill all fields");
      return;
    }

    const leave = {
      driverId: user.id,
      driverName: user.name,
      busNo: user.busNo,
      fromDate,
      toDate,
      reason,
      status: "Applied",       // STORED IMMEDIATELY
      adminFeedback: "",
      appliedAt: new Date().toLocaleString(),
    };

    const old = JSON.parse(localStorage.getItem("driverLeaves")) || [];
    const updated = [...old, leave];

    localStorage.setItem("driverLeaves", JSON.stringify(updated));

    setHistory(updated.filter(l => l.driverId === user.id));

    setFromDate("");
    setToDate("");
    setReason("");

    alert("Leave applied successfully");
  };

  return (
    <div>

      {/* APPLY LEAVE */}
      <Card className="shadow p-3 mb-3">

        <h6>Apply Leave</h6>

        <Form.Control value={user.name} disabled className="mb-2" />
        <Form.Control value={`Bus ${user.busNo}`} disabled className="mb-2" />

        <Form.Group className="mb-2">
          <Form.Label>From Date</Form.Label>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>To Date</Form.Label>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Form.Group>

        <Form.Control
          as="textarea"
          rows={2}
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-2"
        />

        <button className="btn btn-primary w-100 btn-sm" onClick={handleSubmit}>
          Submit Leave
        </button>

      </Card>

      {/* LEAVE HISTORY */}
      <Card className="shadow p-3" style={{ maxHeight: "300px", overflowY: "auto" }}>

        <h6>Leave History</h6>

        {history.length === 0 && <small>No leave records</small>}

        {history.map((l, i) => (
          <div key={i} className="border-bottom py-2">

            <small>
              <b>{l.fromDate}</b> → <b>{l.toDate}</b>
            </small>
            <br />

            <small>{l.reason}</small>
            <br />

            <Badge
              bg={
                l.status === "Approved"
                  ? "success"
                  : l.status === "Rejected"
                  ? "danger"
                  : "primary"
              }
            >
              {l.status}
            </Badge>

            {l.adminFeedback && (
              <div>
                <small className="text-muted">
                  Admin: {l.adminFeedback}
                </small>
              </div>
            )}

          </div>
        ))}

      </Card>

    </div>
  );
}
