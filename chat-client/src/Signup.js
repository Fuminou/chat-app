import React, { useState } from "react";
import { TextField, Button, Container, Paper, Typography, Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

function Signup() {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const response = await fetch("http://localhost:8000/signup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      alert("Signup successful! Please log in.");
      navigate("/login");
    } else {
      alert("Username already exists.");
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          padding: 3,
          textAlign: "center",
          marginTop: "50px",
          backgroundColor: darkMode ? "#424242" : "white",
          color: darkMode ? "#ffffff" : "#000000",
        }}
      >
        <IconButton onClick={toggleDarkMode} sx={{ float: "right" }}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        <Typography variant="h5">Sign Up</Typography>

        <TextField
          fullWidth
          label="Username"
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ backgroundColor: darkMode ? "#616161" : "white", borderRadius: 1 }}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ backgroundColor: darkMode ? "#616161" : "white", borderRadius: 1 }}
        />

        <Button variant="contained" color="primary" sx={{ marginTop: 2 }} onClick={handleSignup}>
          Sign Up
        </Button>

        <Button sx={{ marginTop: 2 }} onClick={() => navigate("/login")}>
          Already have an account? Login
        </Button>
      </Paper>
    </Container>
  );
}

export default Signup;
