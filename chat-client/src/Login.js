import React, { useState } from "react";
import { TextField, Button, Container, Paper, Typography, Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

function Login({ setIsAuthenticated }) {  // ✅ Accept setIsAuthenticated as a prop
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

            setIsAuthenticated(true);  //Ensure authentication state updates
            navigate("/chat", { replace: true });
        } else {
            alert("Invalid username or password");
        }
    } catch (error) {
        console.error("Login Error:", error);
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

        <Typography variant="h5">Login</Typography>

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

        <Button variant="contained" color="primary" sx={{ marginTop: 2 }} onClick={handleLogin}>
          Login
        </Button>

        <Button sx={{ marginTop: 2 }} onClick={() => navigate("/signup")}>
          Don't have an account? Sign Up
        </Button>
      </Paper>
    </Container>
  );
}

export default Login;
