import React, { useState } from "react";
import { Container, TextField, Button, Typography, Paper, Box, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ Hook to navigate pages

  const handleSignup = async () => {
    try {
      const response = await fetch("http://localhost:8000/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        alert("Signup successful! You can now login.");
        navigate("/login"); // ✅ Redirect to login page
      } else {
        alert("Signup failed. Username may already be taken.");
      }
    } catch (error) {
      console.error("Signup Error:", error);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Sign Up
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Username" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="Password" type="password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" color="primary" fullWidth onClick={handleSignup}>
            Sign Up
          </Button>
        </Box>
        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Link component="button" variant="body2" onClick={() => navigate("/login")}>
            Login
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Signup;
