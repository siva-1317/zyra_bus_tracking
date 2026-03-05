import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Modal,
  Row,
  Col,
  Badge,
  Alert,
  Card,
  Pagination,
} from "react-bootstrap";
import API from "../../api";
import { toast } from "../../utils/toast";
import "../../styles/manage-student-soft.css"

export default function ManageStudent() {
  const STUDENTS_PER_PAGE = 20;

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterBusAssigned, setFilterBusAssigned] = useState("");
  const [filterBusNo, setFilterBusNo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
      fetchBuses();
  }, []);






  //modals popup
  const [addStudentModal,setAddStudentModal] = useState(false);
  const studentModalShow = () => setAddStudentModal(true);
  const studentModalClose = () => setAddStudentModal(false);

  const [bulkStudentText, setBulkStudentText] = useState("");
  const [bulkStudentError, setBulkStudentError] = useState("");
  const [bulkStudentSummary, setBulkStudentSummary] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedStudentRolls, setSelectedStudentRolls] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState("selected");
  const [bulkDeleteYear, setBulkDeleteYear] = useState("");
  const [bulkDeleteDept, setBulkDeleteDept] = useState("");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [buses, setBuses] = useState([]);


  // 🔹 NEW STUDENT FORM
  const [newStudent, setNewStudent] = useState({
    rollNumber: "",
    name: "",
    department: "",
    year: "",
    phone: "",
  });

 

  const fetchBuses = async () => {
  const res = await API.get("/admin/bus");
  setBuses(res.data);
};

  // ===============================
  // 🔹 ADD STUDENT
  // ===============================
  const handleAddStudent = async () => {
    if (!newStudent.rollNumber) {
      toast.show({
        type: "warning",
        title: "Add Student",
        message: "Roll Number required",
      });
      return;
    }

    try {
      await API.post("/admin/student", newStudent);

      toast.show({
        type: "success",
        title: "Add Student",
        message: "Student added. Account can be created later by student.",
      });

      setNewStudent({
        rollNumber: "",
        name: "",
        department: "",
        year: "",
        phone: "",
      });

      fetchStudents();
    } catch (err) {
      toast.show({
        type: "error",
        title: "Add Student",
        message: err.response?.data?.message || "Error adding student",
      });
    }
  };

  // 🔹 Filter Logic
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.name?.toLowerCase().includes(search.toLowerCase());

    const matchDept = filterDept ? s.department === filterDept : true;

    const matchAssigned =
      filterBusAssigned === "assigned"
        ? s.assignedBus
        : filterBusAssigned === "not_assigned"
          ? !s.assignedBus
          : true;

    const matchBusNo = filterBusNo ? s.assignedBus === filterBusNo : true;

    return matchSearch && matchDept && matchAssigned && matchBusNo;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE),
  );
  const pageStartIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(
    pageStartIndex,
    pageStartIndex + STUDENTS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDept, filterBusAssigned, filterBusNo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleStudentSelection = (rollNumber) => {
    setSelectedStudentRolls((prev) =>
      prev.includes(rollNumber)
        ? prev.filter((x) => x !== rollNumber)
        : [...prev, rollNumber],
    );
  };

  const handleSelectAllFilteredStudents = (checked) => {
    if (!checked) {
      setSelectedStudentRolls([]);
      return;
    }
    setSelectedStudentRolls(filteredStudents.map((s) => s.rollNumber));
  };

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
      selectedStudent,
    );
    fetchStudents();
    setShowModal(false);
  };

  // 🔹 Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.trim().length < 4) {
      toast.show({
        type: "warning",
        title: "Password Reset",
        message: "New password must be at least 4 characters",
      });
      return;
    }

    try {
      await API.put(
        `/admin/reset-student-password/${selectedStudent.rollNumber}`,
        { newPassword: newPassword.trim() },
      );
      toast.show({
        type: "success",
        title: "Password Reset",
        message: "Password reset successfully",
      });
      setNewPassword("");
    } catch (err) {
      toast.show({
        type: "error",
        title: "Password Reset",
        message: err.response?.data?.message || "Failed to reset password",
      });
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure to delete ?");
    if(!confirmDelete) return;
    try {
      await API.delete(`/admin/delete-student/${selectedStudent.rollNumber}`);
      toast.show({
        type: "success",
        title: "Delete Student",
        message: `Student ${selectedStudent.rollNumber} deleted successfully`,
      });
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      toast.show({
        type: "error",
        title: "Delete Student",
        message: err.response?.data?.message || "Failed to delete student",
      });
    }
  }

  const handleBulkStudentAdd = async () => {
    const lines = bulkStudentText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setBulkStudentError("Enter at least one student row.");
      setBulkStudentSummary("");
      return;
    }

    setBulkLoading(true);
    setBulkStudentError("");
    setBulkStudentSummary("");

    let created = 0;
    let failed = 0;
    const failedLines = [];

    for (let i = 0; i < lines.length; i += 1) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 1 || !parts[0]) {
        failed += 1;
        failedLines.push(i + 1);
        continue;
      }

      const [rollNumber, name = "", department = "", year = "", phone = ""] = parts;
      const payload = {
        rollNumber,
        name,
        department,
        year,
        phone,
      };

      try {
        await API.post("/admin/student", payload);
        created += 1;
      } catch {
        failed += 1;
        failedLines.push(i + 1);
      }
    }

    if (created > 0) fetchStudents();

    setBulkStudentSummary(`Created ${created} students.`);
    if (failed > 0) {
      setBulkStudentError(`Failed ${failed} rows. Line numbers: ${failedLines.join(", ")}`);
    }

    setBulkLoading(false);
  };

  const handleBulkDeleteStudents = async () => {
    let payload = { mode: bulkDeleteMode };

    if (bulkDeleteMode === "selected") {
      if (selectedStudentRolls.length === 0) {
        toast.show({
          type: "warning",
          title: "Bulk Delete",
          message: "Select at least one student",
        });
        return;
      }
      payload = { ...payload, rollNumbers: selectedStudentRolls };
    }

    if (bulkDeleteMode === "year") {
      if (!bulkDeleteYear) {
        toast.show({
          type: "warning",
          title: "Bulk Delete",
          message: "Enter a year",
        });
        return;
      }
      payload = { ...payload, year: Number(bulkDeleteYear) };
    }

    if (bulkDeleteMode === "department") {
      if (!bulkDeleteDept.trim()) {
        toast.show({
          type: "warning",
          title: "Bulk Delete",
          message: "Enter a department",
        });
        return;
      }
      payload = { ...payload, department: bulkDeleteDept.trim() };
    }

    const ok = window.confirm("Delete students for selected bulk condition?");
    if (!ok) return;

    try {
      setBulkDeleteLoading(true);
      const res = await API.delete("/admin/students/bulk", { data: payload });
      toast.show({
        type: "success",
        title: "Bulk Delete",
        message: `${res.data.deletedCount || 0} student(s) deleted`,
      });
      setSelectedStudentRolls([]);
      fetchStudents();
    } catch (err) {
      toast.show({
        type: "error",
        title: "Bulk Delete",
        message: err.response?.data?.message || "Failed to bulk delete students",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };











  return (
    <div className="student-page">
      <h3 className="page-title">Manage Students</h3>

      {/* =============================== */}
      {/* 🔥 ADD STUDENT CARD */}
      {/* =============================== */}

      <Card className="glass-card mb-4">
        <h5 className="section-title">Add New Student</h5>

        <Row>
          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="Roll Number"
              value={newStudent.rollNumber}
              onChange={(e) =>
                setNewStudent({ ...newStudent, rollNumber: e.target.value })
              }
            />
          </Col>

          <Col md={3}>
            <Form.Control
              className="input-soft"
              placeholder="Name"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              className="input-soft"
              placeholder="Department"
              value={newStudent.department}
              onChange={(e) =>
                setNewStudent({ ...newStudent, department: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              className="input-soft"
              placeholder="Year"
              value={newStudent.year}
              onChange={(e) =>
                setNewStudent({ ...newStudent, year: e.target.value })
              }
            />
          </Col>

          <Col md={2}>
            <Form.Control
              className="input-soft"
              placeholder="Phone"
              value={newStudent.phone}
              onChange={(e) =>
                setNewStudent({ ...newStudent, phone: e.target.value })
              }
            />
          </Col>
        </Row>

        <div className="button-row">
          <Button className="primary-btn" onClick={handleAddStudent}>
          Add Student
          </Button>
          <Button className="primary-btn" onClick={studentModalShow}>
            Add Bulk Students
          </Button>
        </div>
      </Card>

      {/* =============================== */}
      {/* 🔍 FILTER SECTION */}
      {/* =============================== */}
   

      <Card className="glass-card mb-4">
      <h5 className="section-title mb-3">Filters</h5>
      <Row className="g-3">
        <Col md={3}>
          <Form.Control
            className="input-soft"
            placeholder="Search Roll / Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>

        <Col md={2}>
          <Form.Control
            className="input-soft"
            placeholder="Department"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          />
        </Col>

        <Col md={2}>
          <Form.Select
            className="input-soft"
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
            className="input-soft"
            placeholder="Bus Number"
            value={filterBusNo}
            onChange={(e) => setFilterBusNo(e.target.value)}
          />
        </Col>
      </Row>
      </Card>

     

      {/* =============================== */}
      {/* 📋 TABLE */}
      {/* =============================== */}

      <Card className="glass-card mb-4">
      <h5 className="section-title mb-3">Students List</h5>
      <Table bordered hover responsive className="table-soft">
        <thead>
          <tr>
            <th>
              <Form.Check
                type="checkbox"
                checked={
                  filteredStudents.length > 0 &&
                  filteredStudents.every((s) => selectedStudentRolls.includes(s.rollNumber))
                }
                onChange={(e) => handleSelectAllFilteredStudents(e.target.checked)}
              />
            </th>
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
          {paginatedStudents.map((s) => (
            <tr key={s._id}>
              <td>
                <Form.Check
                  type="checkbox"
                  checked={selectedStudentRolls.includes(s.rollNumber)}
                  onChange={() => toggleStudentSelection(s.rollNumber)}
                />
              </td>
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
                <Button size="sm" onClick={() => openStudent(s.rollNumber)} className="primary-btn">
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <div className="text-muted">
          Showing {filteredStudents.length === 0 ? 0 : pageStartIndex + 1}-
          {Math.min(pageStartIndex + STUDENTS_PER_PAGE, filteredStudents.length)} of{" "}
          {filteredStudents.length} students
        </div>
        <Pagination className="mb-0">
          <Pagination.Prev
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          />
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Pagination.Item
              key={page}
              active={page === currentPage}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>
      </Card>

      <Card className="glass-card mb-4">
        <h5 className="section-title">Batch Actions</h5>
        <p className="batch-subtext mb-3">Delete students in bulk by selection, year, or department.</p>
        <Row className="g-3 align-items-end">
          <Col md={3}>
            <Form.Select
              className="input-soft"
              value={bulkDeleteMode}
              onChange={(e) => setBulkDeleteMode(e.target.value)}
            >
              <option value="selected">Selected</option>
              <option value="year">Year</option>
              <option value="department">Department</option>
            </Form.Select>
          </Col>
          {bulkDeleteMode === "year" && (
            <Col md={3}>
              <Form.Control
                className="input-soft"
                placeholder="Enter Year"
                value={bulkDeleteYear}
                onChange={(e) => setBulkDeleteYear(e.target.value)}
              />
            </Col>
          )}
          {bulkDeleteMode === "department" && (
            <Col md={3}>
              <Form.Control
                className="input-soft"
                placeholder="Enter Department"
                value={bulkDeleteDept}
                onChange={(e) => setBulkDeleteDept(e.target.value)}
              />
            </Col>
          )}
          <Col md={3}>
            <Button
              className="danger-btn"
              onClick={handleBulkDeleteStudents}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? "Deleting..." : "Bulk Delete"}
            </Button>
          </Col>
        </Row>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered dialogClassName="glass-modal">
        <Modal.Header closeButton>
          <Modal.Title>Student Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedStudent && (
            <>
              <Form.Group className="mb-2">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={selectedStudent.name || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      name: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Department</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={selectedStudent.department || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      department: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Year</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={selectedStudent.year || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      year: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={selectedStudent.phone || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      phone: e.target.value,
                    })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Bus Stop</Form.Label>
                <Form.Control
                  className="input-soft"
                  value={selectedStudent.busStop || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      busStop: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Assign Bus</Form.Label>
                <Form.Select
                  className="input-soft"
                  value={selectedStudent.assignedBus || ""}
                  onChange={(e) =>
                    setSelectedStudent({
                      ...selectedStudent,
                      assignedBus: e.target.value,
                    })
                  }
                >
                  <option value="">-- Select Bus --</option>

                  {buses.map((bus) => (
                    <option key={bus._id} value={bus.busNo}>
                      {bus.busNo} - {bus.routeName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <hr />

              <Form.Group className="mb-2">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  className="input-soft"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Form.Group>

              <div className="button-row">
              <Button className="warning-btn" onClick={handleResetPassword}>
                Reset Password
              </Button>

              <Button className="primary-btn" onClick={handleUpdate}>
                Update Student
              </Button>
              <Button className="danger-btn" onClick={handleDelete}>
                  Delete
              </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={addStudentModal} onHide={studentModalClose} centered dialogClassName="glass-modal">
      <Modal.Header closeButton>
         <Modal.Title>Add Bulk Students</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="batch-modal-wrap">
        <Form.Group>
          <Form.Label className="section-heading">Paste CSV rows (one per line)</Form.Label>
          <Form.Control
            as="textarea"
            rows={7}
            className="input-soft"
            value={bulkStudentText}
            onChange={(e) => setBulkStudentText(e.target.value)}
            placeholder={"S101,John,CS,3,9876543210\nS102,Meera,IT,2,9123456789"}
          />
          <div className="batch-help-text">
            Format: <code>rollNumber,name,department,year,phone</code>
          </div>
        </Form.Group>
        {bulkStudentError && <Alert variant="warning" className="mt-3 mb-2">{bulkStudentError}</Alert>}
        {bulkStudentSummary && <Alert variant="success" className="mt-3 mb-2">{bulkStudentSummary}</Alert>}
        <Button
          onClick={handleBulkStudentAdd}
          className="primary-btn mt-2"
          disabled={bulkLoading}
        >
          {bulkLoading ? "Adding..." : "Add Bulk Students"}
        </Button>
        </div>

      </Modal.Body>


      </Modal>

  
    </div>
  );
  }
      
