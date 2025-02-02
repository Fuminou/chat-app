import React, { useState, useEffect } from "react";
import { TextField, Button, Container, Paper, Typography, Avatar, IconButton, Dialog, DialogActions, DialogContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage"; // Helper function for cropping
import { useTheme } from "./ThemeContext";

function Profile() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "";
  const [profilePicture, setProfilePicture] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState(null); // For profile picture upload
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [openCropper, setOpenCropper] = useState(false);

  // Load profile info
  useEffect(() => {
    fetch(`http://localhost:8000/get_user_profile/?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile_picture) setProfilePicture(data.profile_picture);
        if (data.bio) setBio(data.bio);
      })
      .catch((error) => console.error("Error fetching profile:", error));
  }, []);

  // Handle image selection
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setImageSrc(reader.result);
    setOpenCropper(true);
  };

  // Save cropped area
  const handleCropComplete = (_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Handle cropped image submission
  const handleSaveCroppedImage = async () => {
    const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
    setProfilePicture(croppedImage);
    setOpenCropper(false);

    // Upload to backend
    const formData = new FormData();
    formData.append("username", username);
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/upload_profile_picture/", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      alert("Failed to upload profile picture.");
    }
  };

  // Handle profile update
  const handleSave = async () => {
    const response = await fetch("http://localhost:8000/update_profile/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, bio }),
    });

    if (response.ok) {
      alert("Profile updated!");
    } else {
      alert("Failed to update profile.");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          padding: 3,
          textAlign: "center",
          marginTop: "50px",
          backgroundColor: darkMode ? "#424242" : "#ffffff",
          color: darkMode ? "#ffffff" : "#000000",
        }}
      >
        {/* 🔙 Back to Chat Button */}
        <IconButton onClick={() => navigate("/chat")} sx={{ float: "left" }}>
          <ArrowBackIcon sx={{ color: darkMode ? "white" : "black" }} />
        </IconButton>

        <Typography variant="h5">Edit Profile</Typography>

        {/* User Avatar */}
        <Avatar src={profilePicture} sx={{ width: 100, height: 100, margin: "20px auto" }} />

        {/* Profile Picture Upload */}
        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {/* Cropping Dialog */}
        <Dialog open={openCropper} onClose={() => setOpenCropper(false)} fullWidth maxWidth="sm">
          <DialogContent>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCropper(false)}>Cancel</Button>
            <Button onClick={handleSaveCroppedImage} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bio Input */}
        <TextField
          fullWidth
          label="Bio"
          margin="normal"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          multiline
          rows={3}
          sx={{ backgroundColor: darkMode ? "#616161" : "white", borderRadius: 1 }}
        />

        {/* Save Button */}
        <Button variant="contained" color="primary" sx={{ marginTop: 2 }} onClick={handleSave}>
          Save Changes
        </Button>
      </Paper>
    </Container>
  );
}

export default Profile;
