import { useEffect, useState } from "react";
import { Form, Button, Table, Badge, Card, Row, Col, Alert } from "react-bootstrap";
import API from "../../api";
import "../../styles/announcement.css";

export default function Announcement() {

  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    audience: "all",
    busNo: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [clearMode, setClearMode] = useState("last_week");
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearSuccess, setClearSuccess] = useState("");

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await API.get("/admin/announcement");
      setAnnouncements(res.data);
      setSelectedAnnouncementIds([]);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Handle Change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Send Announcement
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setSuccess("");
      setClearError("");
      setClearSuccess("");

      await API.post("/admin/announcement", {
        ...formData,
        busNo: formData.busNo || null
      });

      setFormData({
        title: "",
        message: "",
        audience: "all",
        busNo: ""
      });

      setSuccess("Announcement Sent Successfully ✅");
      fetchAnnouncements();

    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const toggleAnnouncementSelection = (id) => {
    setSelectedAnnouncementIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (checked) => {
    if (!checked) {
      setSelectedAnnouncementIds([]);
      return;
    }
    setSelectedAnnouncementIds(announcements.map((a) => a._id));
  };

  const handleClearSelected = async () => {
    if (selectedAnnouncementIds.length === 0) {
      setClearError("Select at least one announcement.");
      setClearSuccess("");
      return;
    }

    const ok = window.confirm(`Delete ${selectedAnnouncementIds.length} selected announcement(s)?`);
    if (!ok) return;

    try {
      setClearLoading(true);
      setClearError("");
      const res = await API.delete("/admin/announcement", {
        data: { mode: "selected", ids: selectedAnnouncementIds },
      });
      setClearSuccess(`${res.data.deletedCount || 0} announcement(s) deleted.`);
      fetchAnnouncements();
    } catch (err) {
      setClearError(err.response?.data?.message || "Failed to clear selected announcements");
      setClearSuccess("");
    } finally {
      setClearLoading(false);
    }
  };

  const handleClearByRange = async () => {
    const label = clearMode === "last_week" ? "last 1 week" : "last 1 month";
    const ok = window.confirm(`Delete announcements from ${label}?`);
    if (!ok) return;

    try {
      setClearLoading(true);
      setClearError("");
      const res = await API.delete("/admin/announcement", {
        data: { mode: clearMode },
      });
      setClearSuccess(`${res.data.deletedCount || 0} announcement(s) deleted.`);
      fetchAnnouncements();
    } catch (err) {
      setClearError(err.response?.data?.message || "Failed to clear announcements");
      setClearSuccess("");
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="announcement-container">

      <h3 className="page-title">Announcements</h3>

      {/* ================= SEND ANNOUNCEMENT ================= */}
      <Card className="glass-card p-4 mb-4">
        <h5 className="section-title mb-4">Send Announcement</h5>

        {success && <Alert variant="success">{success}</Alert>}

        <Row className="g-4">

          <Col md={6}>
            <Form.Label>Title</Form.Label>
            <Form.Control
              className="input-soft"
              placeholder="Enter announcement title"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
          </Col>

          <Col md={6}>
            <Form.Label>Audience</Form.Label>
            <Form.Select
              className="input-soft"
              name="audience"
              value={formData.audience}
              onChange={handleChange}
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="drivers">Drivers</option>
            </Form.Select>
          </Col>

          <Col md={12}>
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              className="input-soft"
              placeholder="Write announcement message..."
              name="message"
              value={formData.message}
              onChange={handleChange}
            />
          </Col>

          <Col md={6}>
            <Form.Label>Bus Number (Optional)</Form.Label>
            <Form.Control
              className="input-soft"
              placeholder="Enter bus number"
              name="busNo"
              value={formData.busNo}
              onChange={handleChange}
            />
          </Col>

          <Col md={6} className="d-flex align-items-end">
            <Button
              className="primary-btn w-100"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Announcement"}
            </Button>
          </Col>

        </Row>
      </Card>

      {/* ================= ANNOUNCEMENT LIST ================= */}
      <Card className="glass-card p-3">
        <h5 className="section-title mb-3">Previous Announcements</h5>
        <div className="clear-actions-row mb-3">
          <Button
            className="primary-btn clear-action-btn"
            onClick={handleClearSelected}
            disabled={clearLoading}
          >
            Clear Selected
          </Button>
          <Form.Select
            className="input-soft clear-select"
            value={clearMode}
            onChange={(e) => setClearMode(e.target.value)}
          >
            <option value="last_week">Last 1 Week</option>
            <option value="last_month">Last 1 Month</option>
          </Form.Select>
          <Button
            className="primary-btn clear-action-btn"
            onClick={handleClearByRange}
            disabled={clearLoading}
          >
            Clear by Period
          </Button>
        </div>
        {clearError && <Alert variant="danger">{clearError}</Alert>}
        {clearSuccess && <Alert variant="success">{clearSuccess}</Alert>}

        <Table responsive className="table-soft">
          <thead>
            <tr>
              <th>
                <Form.Check
                  type="checkbox"
                  checked={
                    announcements.length > 0 &&
                    selectedAnnouncementIds.length === announcements.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>Title</th>
              <th>Message</th>
              <th>Audience</th>
              <th>Bus</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {announcements.map((a, index) => (
              <tr key={index}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedAnnouncementIds.includes(a._id)}
                    onChange={() => toggleAnnouncementSelection(a._id)}
                  />
                </td>
                <td>{a.title}</td>
                <td>{a.message}</td>
                <td>
                  <Badge className="badge-soft">
                    {a.audience}
                  </Badge>
                </td>
                <td>{a.busNo || "-"}</td>
                <td>
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>

        </Table>
      </Card>

    </div>
  );
}
