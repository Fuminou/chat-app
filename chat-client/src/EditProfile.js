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
  const [file, setFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [openCropper, setOpenCropper] = useState(false);
  const [croppedImage, setCroppedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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

  // Upload cropped image to the backend
  const handleSaveCroppedImage = async () => {
    try {
      const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(croppedImg);
      setProfilePicture(croppedImg);
      setOpenCropper(false);

      // Upload to backend
      const formData = new FormData();
      formData.append("username", username);
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/upload_profile_picture/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload profile picture.");

      const data = await response.json();
      setProfilePicture(data.profile_picture_url);
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  // Handle profile update
  const handleSave = async () => {
    try {
      const response = await fetch("http://localhost:8000/update_profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bio }),
      });

      if (!response.ok) throw new Error("Failed to update profile.");

      alert("Profile updated!");
    } catch (error) {
      console.error(error);
      alert("Error updating profile.");
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
        <IconButton onClick={() => navigate("/chat")} sx={{ float: "left" }}>
          <ArrowBackIcon sx={{ color: darkMode ? "white" : "black" }} />
        </IconButton>

        <Typography variant="h5">Edit Profile</Typography>

        <Avatar src={profilePicture} sx={{ width: 100, height: 100, margin: "20px auto" }} />

        <input type="file" accept="image/*" onChange={handleImageUpload} />

        <Dialog open={openCropper} onClose={() => setOpenCropper(false)} fullWidth maxWidth="sm">
          <DialogContent>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}        // ✅ Fix added
              onZoomChange={setZoom}        // ✅ Fix added
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

        <TextField fullWidth label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} multiline rows={3} sx={{ backgroundColor: darkMode ? "#616161" : "white", borderRadius: 1 }} />

        <Button variant="contained" color="primary" sx={{ marginTop: 2 }} onClick={handleSave}>
          Save Changes
        </Button>
      </Paper>
    </Container>
  );
}

export default Profile;
