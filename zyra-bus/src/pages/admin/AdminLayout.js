import { Container, Row, Col, Nav } from "react-bootstrap";
import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <Container fluid className="p-0">
      <Row className="g-0">

        {/* Sidebar */}
        <Col md={3} lg={2} className="sidebar vh-100 p-3">
          <h3 className="text-white mb-4">Admin Panel</h3>

          <Nav className="flex-column">

            <Nav.Link
              as={NavLink}
              to="/admin/dashboard"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Dashboard
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/bus"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Manage Bus
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/student"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Manage Students
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/driver"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Manage Drivers
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/trip"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Trip Management
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/announcement"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Announcements
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/feedback"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Feedback
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/admin/leave"
              className={({ isActive }) =>
                isActive ? "sidebar-link active-link" : "sidebar-link"
              }
            >
              Leave Requests
            </Nav.Link>

          </Nav>
        </Col>

        {/* Main Content */}
        <Col md={9} lg={10} className="p-4 bg-light vh-100 overflow-auto">

          <Outlet />
        </Col>

      </Row>
    </Container>
  );
}
