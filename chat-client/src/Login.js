import React, { useState } from "react";
import { Container, TextField, Button, Typography, Paper, Box, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ Hook to navigate pages

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:8000/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("username", username);
        navigate("/chat"); // ✅ Redirect to chat page
      } else {
        alert("Invalid username or password");
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Login
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Username" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="Password" type="password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
            Login
          </Button>
        </Box>
        <Typography sx={{ mt: 2 }}>
          Don't have an account?{" "}
          <Link component="button" variant="body2" onClick={() => navigate("/signup")}>
            Sign Up
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Login;
