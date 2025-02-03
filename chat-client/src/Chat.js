import React, { useState, useEffect, useRef } from "react";
import { TextField, Button, Container, Paper, Typography, Box, IconButton, Avatar, Drawer, List, ListItem, ListItemAvatar, ListItemText, Divider } from "@mui/material";
import { useTheme } from "./ThemeContext";
import { useNavigate } from "react-router-dom";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PeopleIcon from "@mui/icons-material/People";
import dayjs from "dayjs";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";


function Chat() {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const [socket, setSocket] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [activeUsers, setActiveUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [croppedImage, setCroppedImage] = useState(null);
const [profilePicture, setProfilePicture] = useState("");


  // Fetch active users
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const response = await fetch("http://localhost:8000/get_active_users/");
        if (response.ok) {
          const data = await response.json();
          setActiveUsers(data.active_users);
        }
      } catch (error) {
        console.error("Error fetching active users:", error);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch messages from backend when chat loads
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("http://localhost:8000/get_messages/");
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, []);

  // Fetch user profiles
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const uniqueUsernames = [...new Set(messages.map((msg) => msg.sender))];
      for (const user of uniqueUsernames) {
        if (!userProfiles[user]) {
          try {
            const res = await fetch(`http://localhost:8000/get_user_profile/?username=${user}`);
            const profileData = await res.json();
            setUserProfiles((prev) => ({
              ...prev,
              [user]: profileData.profile_picture || "",
            }));
          } catch (error) {
            console.error("Error fetching profile picture:", error);
          }
        }
      }
    };

    fetchUserProfiles();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws?token=${token}`);

    ws.onopen = () => {
      console.log("Connected to WebSocket!");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);
        setMessages((prev) => [...prev, { sender: data.sender, text: data.text, timestamp: data.timestamp }]);

        if (!userProfiles[data.sender]) {
          fetch(`http://localhost:8000/get_user_profile/?username=${data.sender}`)
            .then((res) => res.json())
            .then((profileData) => {
              setUserProfiles((prevProfiles) => ({
                ...prevProfiles,
                [data.sender]: profileData.profile_picture || "",
              }));
            })
            .catch((error) => console.error("Error fetching profile picture:", error));
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => console.log("WebSocket disconnected.");

    return () => ws.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save message to DB and send via WebSocket
  const sendMessage = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket is not open yet.");
      return;
    }

    const messageData = { sender: username, text: message };

    try {
      await fetch("http://localhost:8000/send_message/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      socket.send(JSON.stringify(messageData));
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSaveCroppedImage = async () => {
    if (!croppedImage) {
      console.error("No cropped image available.");
      return;
    }
  
    const formData = new FormData();
    formData.append("username", localStorage.getItem("username"));
    formData.append("file", croppedImage);
  
    try {
      const response = await fetch("http://localhost:8000/upload_profile_picture/", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("Failed to upload profile picture.");
      }
  
      const data = await response.json();
      setProfilePicture(data.profile_picture_url);
      console.log("Profile picture updated successfully:", data.profile_picture_url);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
    }
  };
  
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
  
    try {
      const response = await fetch("http://localhost:8000/logout/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.ok) {
        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("username");
  
        // Redirect to login page
        window.location.href = "/login";
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          marginTop: 5,
          backgroundColor: darkMode ? "#424242" : "#ffffff",
          color: darkMode ? "#ffffff" : "#000000",
        }}
      >
        {/* 🔹 Profile, Sidebar & Dark Mode Toggle */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <IconButton onClick={() => navigate("/edit-profile")}>
            <AccountCircleIcon sx={{ color: darkMode ? "white" : "black" }} />
          </IconButton>
          <IconButton onClick={() => setSidebarOpen(true)}>
            <PeopleIcon sx={{ color: darkMode ? "white" : "black" }} />
          </IconButton>
          <IconButton onClick={toggleDarkMode}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton onClick={handleLogout} sx={{ color: darkMode ? "white" : "black" }}>
            <ExitToAppIcon />
          </IconButton>
        </Box>

        <Typography variant="h4" align="center" gutterBottom>
          Chat App
        </Typography>

        <Box sx={{ height: "400px", overflowY: "auto", border: "1px solid #ddd", padding: 2, backgroundColor: darkMode ? "#303030" : "#f5f5f5", display: "flex", flexDirection: "column" }}>
          {messages.map((msg, index) => {
            const isOwnMessage = msg.sender === username;
            const profilePic = userProfiles[msg.sender] || "";
            const formattedTimestamp = dayjs(msg.timestamp).format("h:mm A");

            return (
              <Box key={index} sx={{ display: "flex", alignItems: "center", marginBottom: "10px", justifyContent: isOwnMessage ? "flex-end" : "flex-start" }}>
                {!isOwnMessage && <Avatar src={profilePic} sx={{ width: 35, height: 35, marginRight: 1 }} />}
                <Box sx={{ padding: 1, borderRadius: 2, backgroundColor: isOwnMessage ? "#4caf50" : "#2196f3", color: "white", textAlign: isOwnMessage ? "right" : "left" }}>
                  <Typography variant="body2">{isOwnMessage ? "You" : msg.sender}</Typography>
                  <Typography>{msg.text}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>{formattedTimestamp}</Typography>
                </Box>
                {isOwnMessage && <Avatar src={profilePic} sx={{ width: 35, height: 35, marginLeft: 1 }} />}
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ display: "flex", marginTop: 2 }}>
          <TextField fullWidth value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
          <Button variant="contained" color="primary" sx={{ marginLeft: 1, height: "56px" }} onClick={sendMessage}>
            Send
          </Button>
        </Box>

        {/* Sidebar for Active Users */}
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <Typography variant="h6" sx={{ padding: 2 }}>Active Users</Typography>
          <Divider />
          <List>
            {activeUsers.map((user) => (
              <ListItem button key={user.username} onClick={() => navigate(`/profile/${user.username}`)}>
                <ListItemAvatar><Avatar src={user.profile_picture} /></ListItemAvatar>
                <ListItemText primary={user.username} />
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Paper>
    </Container>
  );
}

export default Chat;
