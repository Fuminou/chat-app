export default async function getCroppedImg(imageSrc, croppedAreaPixels, outputFormat = "base64") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = "anonymous"; // Prevent CORS issues for external images

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped area onto the canvas
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert to Blob or Base64 depending on the format
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to crop the image."));
            return;
          }

          if (outputFormat === "blob") {
            resolve(blob); // Return as Blob
          } else {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve(reader.result); // Return as Base64
          }
        },
        "image/jpeg",
        0.9 // High quality
      );
    };

    image.onerror = (error) => reject(new Error(`Error loading image: ${error.message}`));
  });
}
