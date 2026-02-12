import { useEffect, useState } from "react";
import { Form, Button, Table, Badge } from "react-bootstrap";
import API from "../../api";

export default function Announcement() {

  const [announcements, setAnnouncements] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    audience: "all",
    busNo: ""
  });

  const [loading, setLoading] = useState(false);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await API.get("/admin/announcement");
      setAnnouncements(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Handle Input Change
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

      fetchAnnouncements();

    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <div>
      <h3>Send Announcement</h3>

      {/* FORM */}
      <div style={{ maxWidth: "600px" }}>
        <Form>
          <Form.Control
            className="mb-2"
            placeholder="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
          />

          <Form.Control
            as="textarea"
            rows={3}
            className="mb-2"
            placeholder="Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
          />

          <Form.Select
            className="mb-2"
            name="audience"
            value={formData.audience}
            onChange={handleChange}
          >
            <option value="all">All</option>
            <option value="students">Students</option>
            <option value="drivers">Drivers</option>
          </Form.Select>

          <Form.Control
            className="mb-2"
            placeholder="Bus Number (Optional)"
            name="busNo"
            value={formData.busNo}
            onChange={handleChange}
          />

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send Announcement"}
          </Button>
        </Form>
      </div>

      {/* ANNOUNCEMENT LIST */}
      <div className="mt-5">
        <h4>Previous Announcements</h4>

        <Table bordered hover responsive>
          <thead>
            <tr>
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
                <td>{a.title}</td>
                <td>{a.message}</td>
                <td>
                  <Badge bg="info">{a.audience}</Badge>
                </td>
                <td>{a.busNo || "-"}</td>
                <td>
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

    </div>
  );
}
