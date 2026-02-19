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

const handleReview = async (id) => {
  try {
    await API.put(`/admin/feedback/${id}/review`);
    fetchFeedbacks();
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
              <td>{f.userId?.username}</td>
              <td>{f.message}</td>
              <td>{f.status || "Pending"}</td>
              <td>
                {f.status === "new" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleReview(f._id)}
                  >
                    Mark as Reviewed
                  </Button>
                ) : (
                  <span className="text-success">Reviewed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
