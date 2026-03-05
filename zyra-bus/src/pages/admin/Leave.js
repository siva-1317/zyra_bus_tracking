import { useEffect, useState } from "react";
import { Button, Badge, Modal, Form } from "react-bootstrap";
import API from "../../api";
import "../../styles/leave.css";

export default function Leave() {

  const [leaves, setLeaves] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [adminRemark, setAdminRemark] = useState("");

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

  // Open Modal
  const openModal = (leaveId, action) => {
    setSelectedLeaveId(leaveId);
    setSelectedAction(action);
    setAdminRemark("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  // Confirm Approve / Reject
  const handleConfirm = async () => {
    try {
      await API.put(`/admin/leave/${selectedLeaveId}`, {
        status: selectedAction,
        adminRemark: adminRemark,
      });

      closeModal();
      fetchLeaves();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    if (status === "approved")
      return <Badge className="badge-approved">Approved</Badge>;
    if (status === "rejected")
      return <Badge className="badge-rejected">Rejected</Badge>;
    return <Badge className="badge-pending">Pending</Badge>;
  };

  return (
    <div className="leave-container">

      <div className="leave-header">
        <h2>Driver Leave Requests</h2>
        <p>Manage and review leave applications</p>
      </div>

      <div className="leave-card">

        {leaves.length === 0 && (
          <div className="empty-state">
            No Leave Requests Found
          </div>
        )}

        {leaves.map((leave) => (
          <div className="leave-row" key={leave._id}>

            <div className="leave-info">
              <div>
                <strong>{leave.driver?.name}</strong>
                <span className="driver-id">
                  ({leave.driver?.driverId})
                </span>
              </div>

              <div className="leave-dates">
                {new Date(leave.fromDate).toLocaleDateString()} →
                {new Date(leave.toDate).toLocaleDateString()}
              </div>

              <div className="leave-reason">
                {leave.reason}
              </div>
            </div>

            <div className="leave-status">
              {getStatusBadge(leave.status)}
            </div>

            <div className="leave-actions">
              <Button
                size="sm"
                className="approve-btn"
                onClick={() => openModal(leave._id, "approved")}
              >
                Approve
              </Button>

              <Button
                size="sm"
                className="reject-btn"
                onClick={() => openModal(leave._id, "rejected")}
              >
                Reject
              </Button>
            </div>

          </div>
        ))}

      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedAction === "approved" ? "Approve Leave" : "Reject Leave"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Admin Remark</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder="Enter your remark..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>

          <Button
            variant={selectedAction === "approved" ? "success" : "danger"}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}