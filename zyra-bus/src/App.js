import "./App.css";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import StudentDashboard from "./pages/student/StudentDashboard";
import DriverDashboard from "./pages/driver/DriverDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedRoute from "./pages/ProtectedRoute";
import Leave from "./pages/admin/Leave";
import CreateAccount from "./pages/CreateAccount";
import AdminLayout from "./pages/admin/AdminLayout";
import ManageBus from "./pages/admin/ManageBus";
import ManageStudent from "./pages/admin/ManageStudent";
import ManageDriver from "./pages/admin/ManageDriver";
import TripManagement from "./pages/admin/TripManagement";
import Announcement from "./pages/admin/Announcement";
import Feedback from "./pages/admin/Feedback";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />


        <Route path="/student/dashboard" element={<StudentDashboard />} />
       


      <Route
        path="/driver/dashboard"
        element={
          <ProtectedRoute>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <Leave />
          </ProtectedRoute>
        }
      />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="bus" element={<ManageBus />} />
        <Route path="student" element={<ManageStudent />} />
        <Route path="driver" element={<ManageDriver />} />
        <Route path="trip" element={<TripManagement />} />
        <Route path="announcement" element={<Announcement />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="leave" element={<Leave />} />
      </Route>
    </Routes>
  );
}

export default App;
