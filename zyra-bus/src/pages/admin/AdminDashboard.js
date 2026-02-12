import { useEffect, useState } from "react";
import { Card, Row, Col } from "react-bootstrap";
import API from "../../api";

export default function AdminDashboard() {

  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    const res = await API.get("/admin/dashboard-stats");
    setStats(res.data);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) return <h5>Loading...</h5>;

  return (
    <div>
      <h3 className="mb-4">Admin Dashboard</h3>

      {/* 🚌 BUS SECTION */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="p-3 shadow">
            <h6>Total Buses</h6>
            <h3>{stats.buses.totalBuses}</h3>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="p-3 shadow bg-success text-white">
            <h6>Running Trips</h6>
            <h3>{stats.buses.runningTrips}</h3>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="p-3 shadow bg-warning text-white">
            <h6>Planned Trips</h6>
            <h3>{stats.buses.plannedTrips}</h3>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="p-3 shadow bg-primary text-white">
            <h6>Completed Trips</h6>
            <h3>{stats.buses.completedTrips}</h3>
          </Card>
        </Col>
      </Row>

      {/* 🎓 STUDENT SECTION */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="p-3 shadow">
            <h6>Total Students</h6>
            <h3>{stats.students.totalStudents}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-info text-white">
            <h6>Bus Assigned</h6>
            <h3>{stats.students.assignedStudents}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-danger text-white">
            <h6>Not Assigned</h6>
            <h3>{stats.students.unassignedStudents}</h3>
          </Card>
        </Col>
      </Row>

      {/* 🚍 DRIVER SECTION */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="p-3 shadow">
            <h6>Total Drivers</h6>
            <h3>{stats.drivers.totalDrivers}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-success text-white">
            <h6>Assigned Drivers</h6>
            <h3>{stats.drivers.assignedDrivers}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-danger text-white">
            <h6>Unassigned Drivers</h6>
            <h3>{stats.drivers.unassignedDrivers}</h3>
          </Card>
        </Col>
      </Row>

      {/* 💬 FEEDBACK SECTION */}
      <Row>
        <Col md={4}>
          <Card className="p-3 shadow">
            <h6>Total Feedback</h6>
            <h3>{stats.feedback.totalFeedback}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-warning text-white">
            <h6>Pending</h6>
            <h3>{stats.feedback.pendingFeedback}</h3>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="p-3 shadow bg-success text-white">
            <h6>Reviewed</h6>
            <h3>{stats.feedback.reviewedFeedback}</h3>
          </Card>
        </Col>
      </Row>

    </div>
  );
}
