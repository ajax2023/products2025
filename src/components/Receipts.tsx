import { useState, useEffect, useRef } from 'react';
import { Box, Button, Container, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Alert, TextField } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, getDoc } from "firebase/firestore";

interface VideoDevice {
  deviceId: string;
  label: string;
}

const Receipts = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameras, setCameras] = useState<VideoDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scannedText, setScannedText] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getCameras = async () => {
      try {
        // Request camera permission with a default camera first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });

        // Keep this stream active while we enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${devices.indexOf(device) + 1}`
          }));

        // Now we can stop the initial stream
        stream.getTracks().forEach(track => track.stop());

        console.log('Found cameras:', videoDevices);
        setCameras(videoDevices);
        
        // Get saved camera preference or use the first camera
        const savedCameraId = localStorage.getItem('preferredCamera');
        const preferredCamera = savedCameraId && videoDevices.find(d => d.deviceId === savedCameraId);
        if (preferredCamera) {
          setSelectedCamera(preferredCamera.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };

    getCameras();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (!selectedCamera || !videoRef.current) return;

      try {
        // Stop any existing stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } }
        });
        setStream(newStream);
        videoRef.current.srcObject = newStream;
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();
  }, [selectedCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !stream) return;
  
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
  
    const image = canvas.toDataURL("image/jpeg", 1.0);
    setImageUrl(image);
  
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `receipts/${Date.now()}.jpg`);
      await uploadString(storageRef, image.split(",")[1], "base64");
  
      const downloadUrl = await getDownloadURL(storageRef);
      console.log("Uploaded receipt to Firebase:", downloadUrl);
  
      // Send the image URL for text extraction
      await extractTextFromImage(downloadUrl);
    } catch (error) {
      console.error("Error uploading receipt:", error);
    }
  };

  const extractTextFromImage = async (imageUrl: string) => {
    try {
      const db = getFirestore();
      
      // Extract the filename from the Firebase Storage URL
      const decodedUrl = decodeURIComponent(imageUrl);
      const urlObj = new URL(decodedUrl);
      const objectPath = urlObj.pathname.split('/o/')[1];  // Get the path after /o/
      const fullPath = decodeURIComponent(objectPath);  // Decode again to handle %2F
      
      // Get just the filename without the receipts/ prefix
      const filename = fullPath.replace('receipts/', '');
      
      if (!filename) {
        console.error("Could not extract filename from URL:", imageUrl);
        return;
      }

      console.log("Looking for document with ID:", filename);
      const docRef = doc(db, "receipts", filename);
      let attempts = 0;
  
      // Polling Firestore to wait for text extraction
      while (attempts < 20) { // Increased attempts since Vision API can take time
        console.log(`Attempt ${attempts + 1}: Checking for text...`);
        await new Promise(res => setTimeout(res, 2000)); // Check every 2 seconds
        
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Found document:", data);
          
          if (data.status === "completed" && data.text) {
            console.log("Text extracted successfully:", data.text);
            setScannedText(data.text);
            return;
          } else if (data.status === "error") {
            console.error("Error processing receipt:", data.error);
            return;
          }
        }
        attempts++;
      }
  
      console.error("Text extraction timeout after 40 seconds");
    } catch (error) {
      console.error("Error fetching receipt text:", error);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `receipt-${new Date().toISOString().slice(0,19)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCameraChange = (newCameraId: string) => {
    setSelectedCamera(newCameraId);
    setImageUrl(null);
    // Save camera preference
    localStorage.setItem('preferredCamera', newCameraId);
  };

  const handleReset = () => {
    setImageUrl(null);
    setScannedText('');
    // Restart the camera stream
    if (selectedCamera) {
      const startCamera = async () => {
        try {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedCamera } }
          });
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
        } catch (error) {
          console.error('Error restarting camera:', error);
        }
      };
      startCamera();
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Receipt Scanner
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            After taking a picture, you can use your phone's built-in text recognition:
            <ul style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
              <li>Android: Use Google Lens to extract text</li>
              <li>iPhone: Use Live Text to extract text</li>
            </ul>
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Camera</InputLabel>
            <Select
              value={selectedCamera}
              onChange={(e) => handleCameraChange(e.target.value)}
              label="Select Camera"
            >
              {cameras.map((camera) => (
                <MenuItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!imageUrl ? (
            <>
              <Box sx={{ width: '100%', position: 'relative' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                />
              </Box>
              <Button
                variant="contained"
                startIcon={<PhotoCameraIcon />}
                onClick={handleCapture}
                disabled={!selectedCamera}
              >
                Capture Receipt
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ width: '100%' }}>
                <img 
                  src={imageUrl} 
                  alt="Captured receipt"
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                />
              </Box>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                To extract text from the receipt:
                <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  <li>Click "Save Image" below to save the receipt to your phone</li>
                  {navigator.userAgent.includes('Android') ? (
                    <>
                      <li>Open your gallery and select the saved image</li>
                      <li>Tap the Google Lens icon or open Google Lens app</li>
                      <li>Copy the detected text</li>
                    </>
                  ) : navigator.userAgent.includes('iPhone') ? (
                    <>
                      <li>Open your Photos app and find the saved image</li>
                      <li>Look for the text selection icon (three lines)</li>
                      <li>Select and copy the detected text</li>
                    </>
                  ) : (
                    <>
                      <li>Open the saved image in your preferred photo app</li>
                      <li>Use your system's text recognition tool</li>
                    </>
                  )}
                  <li>Return here and paste the text below</li>
                </ol>
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleDownload}
                >
                  Save Image
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                >
                  Take Another Picture
                </Button>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={scannedText}
                onChange={(e) => setScannedText(e.target.value)}
                placeholder="Paste your scanned receipt text here..."
                sx={{ mt: 2 }}
              />
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Receipts;
