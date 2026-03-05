import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import "../../src/styles/login.css";

export default function Login() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.post("/auth/login", formData);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);

      setTimeout(() => {
        navigate(`/${user.role}/dashboard`);
      }, 1200);

    } catch (err) {
      setError("Invalid Username or Password");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!loading) return;
    const steps = [
      "Connecting to API...",
      "API connected",
      "DB connected",
      "Fetching user profile...",
      "Login complete",
    ];
    setLoadingStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        clearInterval(interval);
        return;
      }
      setLoadingStep(i);
    }, 350);
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <Container fluid className="login-bg d-flex justify-content-center align-items-center">
      {loading && (
        <div className="login-loading">
          <div className="login-loading-card">
            <div className="login-loading-steps">
              {[
                "Connecting to API...",
                "API connected",
                "DB connected",
                "Fetching user profile...",
                "Login complete",
              ].map((step, idx) => (
                <div
                  key={step}
                  className={`login-step ${idx <= loadingStep ? "active" : ""}`}
                >
                  <span className="step-dot" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Card className="login-card p-4">

        <div className="text-center mb-4">
          <h2 className="login-title">
            Welcome to <span className="brand-text">Zyra</span>
          </h2>
          <p className="login-subtitle">
            Smart Transport Management
          </p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form>

          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              name="username"
              type="text"
              onChange={handleChange}
              value={formData.username}
              placeholder="Enter username"
              className="input-soft"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              name="password"
              type="password"
              onChange={handleChange}
              value={formData.password}
              placeholder="Enter password"
              className="input-soft"
            />
          </Form.Group>

          <Button
            type="button"
            className="login-btn w-100 mt-3"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

        </Form>

        <div className="text-center mt-3">
          <Link to="/create-account" className="create-link">
            Don't have an account? Create one
          </Link>
        </div>

      </Card>
    </Container>
  );
}
