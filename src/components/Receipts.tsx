import { useState, useEffect, useRef } from 'react';
import { Box, Button, Container, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Alert, TextField } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

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
        if (videoDevices.length > 0) {
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

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
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

  const handleCapture = () => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    const image = canvas.toDataURL('image/jpeg');
    setImageUrl(image);
  };

  const handleReset = () => {
    setImageUrl(null);
  };

  const handleCameraChange = (newCameraId: string) => {
    setSelectedCamera(newCameraId);
    setImageUrl(null);
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
              <TextField
                fullWidth
                multiline
                rows={6}
                value={scannedText}
                onChange={(e) => setScannedText(e.target.value)}
                placeholder="Paste your scanned receipt text here..."
                sx={{ mt: 2, mb: 2 }}
              />
              <Button
                variant="contained"
                color="secondary"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
              >
                Take Another Picture
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Receipts;
