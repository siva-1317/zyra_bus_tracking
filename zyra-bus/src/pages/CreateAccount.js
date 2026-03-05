import React, { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import "../../src/styles/login.css";   // ✅ use same 3D glass CSS

function CreateAccount() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/register", {
        username: formData.username,
        password: formData.password
      });

      setSuccess(res.data.message);

      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {

      if (err.response?.status === 404) {
        setError("Roll Number / Driver ID not found. Contact admin.");
      }
      else if (err.response?.status === 400) {
        setError(err.response.data.message);
      }
      else {
        setError("Something went wrong.");
      }
    }

    setLoading(false);
  };

  return (
    <Container fluid className="login-bg d-flex justify-content-center align-items-center">

      <Card className="login-card">

        <div className="text-center mb-4">
          <h2 className="login-title">
            Create Account for <span className="brand-text">Zyra</span>
          </h2>
          <p className="login-subtitle">
            Join Smart Transport Management
          </p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form>

          <Form.Group className="mb-3">
            <Form.Label>Roll Number / Driver ID</Form.Label>
            <Form.Control
              className="input-soft"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter Roll Number or Driver ID"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Set Password</Form.Label>
            <Form.Control
              className="input-soft"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter Password"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              className="input-soft"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
            />
          </Form.Group>

          <Button
            type="button"
            className="login-btn w-100 mt-3"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </Button>

        </Form>

        <div className="text-center mt-4">
          <Link to="/" className="create-link">
            Already have an account? Login
          </Link>
        </div>

      </Card>
    </Container>
  );
}

export default CreateAccount;
