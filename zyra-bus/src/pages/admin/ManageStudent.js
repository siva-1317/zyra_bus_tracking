import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Modal,
  Row,
  Col,
  Badge,
  Card
} from "react-bootstrap";
import API from "../../api";

export default function ManageStudent() {

  const [students, setStudents] = useState([]);

  // 🔹 NEW STUDENT FORM
  const [newStudent, setNewStudent] = useState({
    rollNumber: "",
    name: "",
    department: "",
    year: "",
    phone: ""
  });

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterBusAssigned, setFilterBusAssigned] = useState("");
  const [filterBusNo, setFilterBusNo] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // 🔹 Fetch Students
  const fetchStudents = async () => {
    const res = await API.get("/admin/student");
    setStudents(res.data);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ===============================
  // 🔹 ADD STUDENT
  // ===============================
  const handleAddStudent = async () => {

    if (!newStudent.rollNumber) {
      alert("Roll Number required");
      return;
    }

    try {
      await API.post("/admin/student", newStudent);

      alert("Student Added Successfully");

      setNewStudent({
        rollNumber: "",
        name: "",
        department: "",
        year: "",
        phone: ""
      });

      fetchStudents();

    } catch (err) {
      alert(err.response?.data?.message || "Error adding student");
    }
  };

  // 🔹 Filter Logic
  const filteredStudents = students.filter((s) => {

    const matchSearch =
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.name?.toLowerCase().includes(search.toLowerCase());

    const matchDept =
      filterDept ? s.department === filterDept : true;

    const matchAssigned =
      filterBusAssigned === "assigned"
        ? s.assignedBus
        : filterBusAssigned === "not_assigned"
        ? !s.assignedBus
        : true;

    const matchBusNo =
      filterBusNo ? s.assignedBus === filterBusNo : true;

    return matchSearch && matchDept && matchAssigned && matchBusNo;
  });

  // 🔹 Open Modal
  const openStudent = async (rollNumber) => {
    const res = await API.get(`/admin/student/${rollNumber}`);
    setSelectedStudent(res.data);
    setShowModal(true);
  };

  // 🔹 Update Student
  const handleUpdate = async () => {
    await API.put(
      `/admin/student/${selectedStudent.rollNumber}`,
      selectedStudent
    );
    fetchStudents();
    setShowModal(false);
  };

  // 🔹 Reset Password
  const handleResetPassword = async () => {
    await API.put(
      `/admin/reset-student-password/${selectedStudent.rollNumber}`,
      { newPassword }
    );
    alert("Password Reset Successfully");
    setNewPassword("");
  };

  return (
    <div>

      <h3 className="mb-3">Manage Students</h3>

      {/* =============================== */}
      {/* 🔥 ADD STUDENT CARD */}
      {/* =============================== */}

      <Card className="p-3 mb-4 shadow-sm">
        <h5>Add New Student</h5>

        <Row>
          <Col md={3}>
            <Form.Control
              placeholder="Roll Number"
              value={newStudent.rollNumber}
              onChange={(e) =>
                setNewStudent({ ...newStudent, rollNumber: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              placeholder="Name"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              placeholder="Department"
              value={newStudent.department}
              onChange={(e) =>
                setNewStudent({ ...newStudent, department: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              placeholder="Year"
              value={newStudent.year}
              onChange={(e) =>
                setNewStudent({ ...newStudent, year: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              placeholder="Phone"
              value={newStudent.phone}
              onChange={(e) =>
                setNewStudent({ ...newStudent, phone: e.target.value })
              }
            />
          </Col>
        </Row>

        <Button
          className="mt-3"
          onClick={handleAddStudent}
        >
          Add Student
        </Button>
      </Card>

      {/* =============================== */}
      {/* 🔍 FILTER SECTION */}
      {/* =============================== */}

      <Row className="mb-3">
        <Col md={3}>
          <Form.Control
            placeholder="Search Roll / Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>

        <Col md={2}>
          <Form.Control
            placeholder="Department"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          />
        </Col>

        <Col md={2}>
          <Form.Select
            value={filterBusAssigned}
            onChange={(e) => setFilterBusAssigned(e.target.value)}
          >
            <option value="">Bus Status</option>
            <option value="assigned">Assigned</option>
            <option value="not_assigned">Not Assigned</option>
          </Form.Select>
        </Col>

        <Col md={2}>
          <Form.Control
            placeholder="Bus Number"
            value={filterBusNo}
            onChange={(e) => setFilterBusNo(e.target.value)}
          />
        </Col>
      </Row>

      {/* =============================== */}
      {/* 📋 TABLE */}
      {/* =============================== */}

      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Department</th>
            <th>Year</th>
            <th>Bus</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s._id}>
              <td>{s.rollNumber}</td>
              <td>{s.name}</td>
              <td>{s.department}</td>
              <td>{s.year}</td>
              <td>{s.assignedBus || "-"}</td>
              <td>
                {s.assignedBus ? (
                  <Badge bg="success">Assigned</Badge>
                ) : (
                  <Badge bg="secondary">Not Assigned</Badge>
                )}
              </td>
              <td>
                <Button
                  size="sm"
                  onClick={() => openStudent(s.rollNumber)}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal remains same */}
      {/* (Your existing modal code unchanged below) */}

    </div>
  );
}
