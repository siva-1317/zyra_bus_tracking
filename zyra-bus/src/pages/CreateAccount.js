import React, { useState } from "react";
import { Container, Card, Form } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

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

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle Register
  const handleRegister = async () => {
    setError("");
    setSuccess("");

    // 🔐 Password match validation
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

      // Redirect to login after 2 sec
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {

      if (err.response?.status === 404) {
        setError("Roll number not found. Contact admin.");
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
    <Container
      fluid
      className="vh-100 d-flex justify-content-center align-items-center"
    >
      <Card style={{ width: "400px" }} className="p-4 shadow">
        <h4>
          Create Account for,{" "}
          <span
            style={{ color: "blueviolet", fontSize: "45px", fontWeight: "900" }}
          >
            Zyra
          </span>
        </h4>

        {error && <p className="text-danger">{error}</p>}
        {success && <p className="text-success">{success}</p>}

        <Form>

          <Form.Group className="mt-3">
            <Form.Label>Roll Number</Form.Label>
            <Form.Control
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter Roll Number"
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label>Set Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter Password"
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
            />
          </Form.Group>

          <div className="text-center">
            <button
              type="button"
              onClick={handleRegister}
              className="btn btn-primary mt-4 w-100"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </Form>

        <div className="text-center mt-3">
          <Link to="/">Already have an account? Login</Link>
        </div>
      </Card>
    </Container>
  );
}

export default CreateAccount;
