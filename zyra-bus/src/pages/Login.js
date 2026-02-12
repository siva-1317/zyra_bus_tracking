import { Container, Card, Form } from "react-bootstrap";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

export default function Login() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",   // ✅ changed
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      navigate(`/${user.role}/dashboard`);

    } catch (err) {
      setError("Invalid Username or Password");
    }

    setLoading(false);
  };

  return (
    <Container fluid className="vh-100 d-flex justify-content-center align-items-center">
      <Card style={{ width: "400px" }} className="p-4 shadow">
        <h2>
          Welcome,{" "}
          <span
            style={{ color: "blueviolet", fontSize: "45px", fontWeight: "900" }}
          >
            Zyra
          </span>
        </h2>

        {error && <p className="text-danger">{error}</p>}

        <Form>
          <Form.Group className="mt-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              name="username"
              type="text"
              onChange={handleChange}
              value={formData.username}
              placeholder="Enter roll number"
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              name="password"
              type="password"
              onChange={handleChange}
              value={formData.password}
              placeholder="Enter password"
            />
          </Form.Group>

          <div className="text-center">
            <button
              type="button"
              className="btn btn-primary mt-4 w-100"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </Form>

        <div className="text-center mt-3">
          <Link to="/create-account">
            Don't have an account? Create one
          </Link>
        </div>
      </Card>
    </Container>
  );
}
