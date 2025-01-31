import React, { useState, useEffect, useRef } from "react";
import { TextField, Button, Container, Paper, Typography, Box } from "@mui/material";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token"); // Retrieve JWT token
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws?token=${token}`);

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket!");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);  // ✅ Ensure proper JSON parsing
            console.log("📩 Message received:", data);
            setMessages((prev) => [...prev, { sender: data.sender, text: data.text }]); // ✅ Store only sender and text
        } catch (error) {
            console.error("❌ Error parsing message:", error);
        }
    };
    

    ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    ws.onclose = () => console.log("⚠️ WebSocket disconnected.");

    return () => ws.close();
}, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("⚠️ Cannot send message: WebSocket is not open yet.");
      return;
    }

    const username = localStorage.getItem("username"); // ✅ Get the actual username
    const messageData = { sender: username, text: message }; // ✅ Send actual username
    socket.send(JSON.stringify(messageData));
    setMessage("");
};



  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 2, marginTop: 5 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Chat App
        </Typography>
        <Box
          sx={{
            height: "400px",
            overflowY: "auto",
            border: "1px solid #ddd",
            padding: 2,
            backgroundColor: "#f5f5f5",
            display: "flex",
            flexDirection: "column",
          }}
        >
            {messages.map((msg, index) => {
                let messageData;

                try {
                    // Ensure the message is parsed correctly
                    messageData = typeof msg === "string" ? JSON.parse(msg) : msg;
                } catch (error) {
                    console.error("Error parsing message:", error);
                    messageData = { sender: "Unknown", text: msg }; // Fallback in case of parsing error
                }

                const currentUser = localStorage.getItem("username"); // ✅ Get logged-in username
                const isOwnMessage = messageData.sender === currentUser; // ✅ Compare sender with logged-in username

                return (
                    <Box
                    key={index}
                    sx={{
                        padding: 1,
                        borderRadius: 2,
                        maxWidth: "75%",
                        marginBottom: "10px",
                        backgroundColor: isOwnMessage ? "#4caf50" : "#2196f3", // ✅ Green for own messages, Blue for others
                        color: "white",
                        alignSelf: isOwnMessage ? "flex-start" : "flex-end", // ✅ Right for own messages, Left for others
                        textAlign: isOwnMessage ? "left" : "right", // ✅ Align text left for own messages, right for others
                    }}
                    >
                    <Typography variant="body2" sx={{ fontSize: "12px", opacity: 0.8 }}>
                        {isOwnMessage ? "You" : messageData.sender}
                    </Typography>
                    <Typography>{messageData.text}</Typography>
                    </Box>
                );
            })}

          <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ display: "flex", marginTop: 2 }}>
          <TextField
            fullWidth
            label="Type a message..."
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button
            variant="contained"
            color="primary"
            sx={{ marginLeft: 1 }}
            onClick={sendMessage}
            disabled={!socket || socket.readyState !== WebSocket.OPEN} // Disable send button if WebSocket is not ready
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Chat;
