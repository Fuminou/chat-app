import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import Chat from "./Chat";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // ✅ Check if user is logged in
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token); // Convert token to boolean
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/login" /> : <Navigate to="/chat" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={isAuthenticated ? <Chat /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
