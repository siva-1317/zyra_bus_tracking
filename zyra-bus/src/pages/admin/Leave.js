import { useEffect, useState } from "react";
import { Table, Button } from "react-bootstrap";
import API from "../../api";

export default function Leave() {

  const [leaves, setLeaves] = useState([]);

  const fetchLeaves = async () => {
    try {
      const res = await API.get("/admin/leave");
      setLeaves(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApproval = async (leaveId, status) => {
    try {
      await API.put(`/admin/leave/${leaveId}`, {
        status
      });

      fetchLeaves(); // Refresh list
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h3>Driver Leave Requests</h3>

      <Table bordered>
        <thead>
          <tr>
            <th>Driver</th>
            <th>Driver Name</th>
            <th>From</th>
            <th>To</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {leaves.map((leave, index) => (
            <tr key={index}>
              <td>{leave.driver?.driverId}</td>
              <td>{leave.driver?.name}</td>
              <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
              <td>{new Date(leave.toDate).toLocaleDateString()}</td>
              <td>{leave.reason}</td>
              <td>{leave.status || "Pending"}</td>
              <td>
                <Button
                  size="sm"
                  variant="success"
                  className="me-2"
                  onClick={() => handleApproval(leave._id, "approved")}
                >
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleApproval(leave._id, "rejected")}
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
