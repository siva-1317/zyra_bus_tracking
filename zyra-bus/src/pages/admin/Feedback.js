import { useEffect, useState } from "react";
import { Table, Button } from "react-bootstrap";
import API from "../../api";

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

  const handleReview = async (id, status) => {
    try {
      await API.put(`/admin/feedback/${id}/review`, {
        status
      });

      fetchFeedbacks(); // Refresh list
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h3>Feedback Review</h3>

      <Table bordered>
        <thead>
          <tr>
            <th>User</th>
            <th>Message</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {feedbacks.map((f, index) => (
            <tr key={index}>
              <td>{f.user?.username}</td>
              <td>{f.message}</td>
              <td>{f.status || "Pending"}</td>
              <td>
                <Button
                  size="sm"
                  variant="success"
                  className="me-2"
                  onClick={() => handleReview(f._id, "approved")}
                >
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleReview(f._id, "rejected")}
                >
                  Reject
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
