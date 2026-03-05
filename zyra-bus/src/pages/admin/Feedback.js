import { useEffect, useState } from "react";
import { Table, Button, Badge, Card } from "react-bootstrap";
import API from "../../api";
import "../../styles/feedback.css";

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);

  const fetchFeedbacks = async () => {
    try {
      const res = await API.get("/admin/feedback");
      setFeedbacks(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleReview = async (id) => {
    try {
      await API.put(`/admin/feedback/${id}/review`);
      fetchFeedbacks();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    if (!status || status === "new") {
      return <Badge className="badge-pending">Pending</Badge>;
    }
    return <Badge className="badge-reviewed">Reviewed</Badge>;
  };

  return (
    <div className="feedback-container">

      <h3 className="page-title">Feedback Review</h3>

      <Card className="glass-card p-3">
        <Table responsive className="table-soft">
          <thead>
            <tr>
              <th>User</th>
              <th>Message</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {feedbacks.map((f) => (
              <tr key={f._id}>
                <td className="fw-semibold">
                  {f.userId?.username || "Unknown"}
                </td>

                <td className="message-cell">
                  {f.message}
                </td>

                <td>
                  {getStatusBadge(f.status)}
                </td>

                <td>
                  {f.status === "new" || !f.status ? (
                    <Button
                      className="primary-btn-sm"
                      onClick={() => handleReview(f._id)}
                    >
                      Mark as Reviewed
                    </Button>
                  ) : (
                    <span className="reviewed-text">
                      ✔ Reviewed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

    </div>
  );
}