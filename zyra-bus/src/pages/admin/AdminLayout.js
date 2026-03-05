import { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Modal, Button } from "react-bootstrap";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import API from "../../api";
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
  FaBars,
  FaSignOutAlt
} from "react-icons/fa";

import "../../styles/admin-layout.css";

export default function AdminLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("adminReadNotifications")) || [];
    } catch {
      return [];
    }
  });
  const [clearedAt, setClearedAt] = useState(() => {
    const stored = localStorage.getItem("adminNotificationsClearedAt");
    return stored ? Number(stored) : 0;
  });
  const navigate = useNavigate();

  const notificationCountLabel = useMemo(() => {
    const count = notifications.filter((n) => !readIds.includes(n.id)).length;
    return count > 99 ? "99+" : String(count);
  }, [notifications, readIds]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const buildNotificationItems = (leaves, feedbacks, complaints) => {
    const items = [];

    (leaves || []).forEach((leave) => {
      const driverName = leave.driver?.name || "Driver";
      const leaveStatus = leave.status || "waiting";
      items.push({
        id: `leave-${leave._id}-${leaveStatus}`,
        type: "leave",
        title: "Leave Request",
        message: `${driverName} leave: ${leaveStatus}`,
        status: leaveStatus,
        route: "/admin/leave",
        time: leave.updatedAt || leave.createdAt || Date.now(),
      });
    });

    (feedbacks || []).forEach((feedback) => {
      const username = feedback.userId?.username || "User";
      const feedbackStatus = feedback.status || "new";
      items.push({
        id: `feedback-${feedback._id}-${feedbackStatus}`,
        type: "feedback",
        title: "Feedback",
        message: `${username}: ${feedbackStatus === "new" ? "Pending review" : "Reviewed"}`,
        status: feedbackStatus,
        route: "/admin/feedback",
        time: feedback.updatedAt || feedback.createdAt || Date.now(),
      });
    });

    (complaints || []).forEach((complaint) => {
      const complaintStatus = complaint.status || "in-review";
      items.push({
        id: `complaint-${complaint._id}-${complaintStatus}`,
        type: "complaint",
        title: "Bus Status Complaint",
        message: `${complaint.busNo || "Bus"}: ${complaint.complaintType || "Issue"} (${complaintStatus})`,
        status: complaintStatus,
        route: "/admin/bus",
        time: complaint.updatedAt || complaint.createdAt || Date.now(),
      });
    });

    return items
      .filter((item) => new Date(item.time).getTime() > clearedAt)
      .sort((a, b) => new Date(b.time) - new Date(a.time));
  };

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const [leaveRes, feedbackRes, complaintsRes] = await Promise.all([
        API.get("/admin/leave"),
        API.get("/admin/feedback"),
        API.get("/admin/bus-complaints"),
      ]);
      const items = buildNotificationItems(
        leaveRes.data || [],
        feedbackRes.data || [],
        complaintsRes.data || [],
      );
      setNotifications(items);
    } catch (err) {
      console.error("Failed to load admin notifications", err);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [clearedAt]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("adminReadNotifications", JSON.stringify(allIds));
  };

  const markOneRead = (id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("adminReadNotifications", JSON.stringify(next));
      return next;
    });
  };

  const clearNotifications = () => {
    const ts = Date.now();
    setNotifications([]);
    setReadIds([]);
    setClearedAt(ts);
    localStorage.setItem("adminNotificationsClearedAt", String(ts));
    localStorage.removeItem("adminReadNotifications");
  };

  const goToReview = (item) => {
    markOneRead(item.id);
    setShowNotifications(false);
    navigate(item.route);
  };

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
    <button
      type="button"
      className="admin-notify-btn"
      onClick={() => setShowNotifications(true)}
      aria-label="Open notifications"
    >
      <FaBell />
      {unreadCount > 0 && <span className="admin-notify-badge">{notificationCountLabel}</span>}
    </button>
  </div>

</div>

          <div className="content-area">
            <Outlet />
          </div>

        </Col>

      </Row>
    </Container>

    {showNotifications && (
      <>
        <div className="admin-notify-overlay" onClick={() => setShowNotifications(false)} />
        <aside className="admin-notify-panel">
          <div className="admin-notify-header">
            <div>
              <h6 className="mb-0">All Requests</h6>
              <small className="text-muted">{unreadCount} unread</small>
            </div>
            <button
              type="button"
              className="admin-notify-close"
              onClick={() => setShowNotifications(false)}
            >
              x
            </button>
          </div>

          <div className="admin-notify-actions">
            <button type="button" className="admin-notify-action" onClick={markAllRead}>
              Mark as read
            </button>
            <button type="button" className="admin-notify-action clear" onClick={clearNotifications}>
              Clear
            </button>
          </div>

          <div className="admin-notify-list">
            {notificationLoading && (
              <div className="admin-notify-empty">Loading requests...</div>
            )}
            {!notificationLoading && notifications.length === 0 && (
              <div className="admin-notify-empty">No requests found</div>
            )}
            {!notificationLoading && notifications.map((item) => (
              <div
                key={item.id}
                className={`admin-notify-item ${readIds.includes(item.id) ? "read" : "unread"}`}
              >
                <div className="admin-notify-item-title">{item.title}</div>
                <div className="admin-notify-item-message">{item.message}</div>
                <div className="admin-notify-item-meta">
                  <span>{new Date(item.time).toLocaleString()}</span>
                  <Button
                    size="sm"
                    className="primary-btn-sm"
                    onClick={() => goToReview(item)}
                  >
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </>
    )}

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
