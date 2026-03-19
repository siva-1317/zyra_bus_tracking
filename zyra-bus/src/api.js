import axios from "axios";

const apiBaseUrl ="https://zyra-bus-tracking.onrender.com/api";

const API = axios.create({
  baseURL: apiBaseUrl,
});

// Automatically attach JWT token
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export default API;
