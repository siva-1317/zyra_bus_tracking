import { useState } from "react";
import { Container, Row, Col, Modal, Button } from "react-bootstrap";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  FaTachometerAlt, 
  FaBus, 
  FaUsers, 
  FaUserTie, 
  FaRoute, 
  FaBullhorn, 
  FaCommentDots, 
  FaCalendarCheck,
  FaBell,
  FaUserCircle,
  FaBars,
  FaSignOutAlt
} from "react-icons/fa";

import "../../styles/admin-layout.css";

export default function AdminLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setLoggingOut(true);
    setTimeout(() => {
      doLogout();
    }, 900);
  };

  return (
    <>
    <Container fluid className="admin-bg p-0">
      <Row className="g-0">

        {/* SIDEBAR */}
        <Col
          md={3}
          lg={2}
          className={`sidebar-glass ${sidebarOpen ? "sidebar-open" : ""}`}
        >
          <div className="sidebar-header">
            <h2>ADMIN</h2>
          </div>

          <div className="nav-section">

            <NavItem to="/admin/dashboard" icon={<FaTachometerAlt />} label="Dashboard" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/bus" icon={<FaBus />} label="Manage Bus" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/student" icon={<FaUsers />} label="Manage Students" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/driver" icon={<FaUserTie />} label="Manage Drivers" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/trip" icon={<FaRoute />} label="Trip Management" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/announcement" icon={<FaBullhorn />} label="Announcements" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/feedback" icon={<FaCommentDots />} label="Feedback" closeSidebar={() => setSidebarOpen(false)} />
            <NavItem to="/admin/leave" icon={<FaCalendarCheck />} label="Leave Requests" closeSidebar={() => setSidebarOpen(false)} />

          </div>

          <div className="sidebar-footer">
            <button
              type="button"
              className="logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </Col>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* MAIN CONTENT */}
        <Col md={9} lg={10} className="main-content-glass">

          {/* TOP NAVBAR */}
          <div className="top-navbar-glass">

  <div className="navbar-left">
    <FaBars 
      className="mobile-toggle"
      onClick={() => setSidebarOpen(!sidebarOpen)}
    />
  </div>

  <div className="top-actions">
    {/* optional icons later */}
  </div>

</div>

          <div className="content-area">
            <Outlet />
          </div>

        </Col>

      </Row>
    </Container>

    <Modal
      show={showLogoutConfirm}
      onHide={() => setShowLogoutConfirm(false)}
      centered
      dialogClassName="glass-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Confirm Logout</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to logout?
      </Modal.Body>
      <Modal.Footer>
        <Button className="secondary-btn" onClick={() => setShowLogoutConfirm(false)}>
          Cancel
        </Button>
        <Button className="logout-btn" onClick={handleLogoutConfirm}>
          Logout
        </Button>
      </Modal.Footer>
    </Modal>

    {loggingOut && (
      <div className="logout-overlay">
        <div className="logout-card">
          <div className="logout-spinner" />
          <div className="logout-text">Logging out...</div>
        </div>
      </div>
    )}
    </>
  );
}


/* Reusable Nav Item */
function NavItem({ to, icon, label, closeSidebar }) {
  return (
    <NavLink
      to={to}
      onClick={closeSidebar}
      className={({ isActive }) =>
        isActive ? "nav-item active-nav" : "nav-item"
      }
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
