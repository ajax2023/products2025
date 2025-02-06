import { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface VideoDevice {
  deviceId: string;
  label: string;
}

const Receipts = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameras, setCameras] = useState<VideoDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${devices.indexOf(device) + 1}`
          }));
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };

    getCameras();
  }, []);

  const handleCapture = async () => {
    if (!selectedCamera) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: { exact: selectedCamera } } 
      });
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      
      video.srcObject = stream;
      await video.play();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      const image = canvas.toDataURL('image/jpeg');
      setImageUrl(image);
      
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Receipt Scanner
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Camera</InputLabel>
            <Select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              label="Select Camera"
            >
              {cameras.map((camera) => (
                <MenuItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={handleCapture}
            disabled={!selectedCamera}
          >
            Take Picture
          </Button>

          {imageUrl && (
            <Box sx={{ mt: 2, width: '100%' }}>
              <img 
                src={imageUrl} 
                alt="Captured receipt"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Receipts;
