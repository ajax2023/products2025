import { useState, useEffect, useRef } from 'react';
import { Box, Button, Container, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Alert, TextField } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { getDeviceInfo } from '../utils/deviceDetection';

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
  const deviceInfo = getDeviceInfo();

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

    if (!deviceInfo.hasLiveText && !deviceInfo.hasMLKit) {
      getCameras();
    }

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

    if (!deviceInfo.hasLiveText && !deviceInfo.hasMLKit) {
      startCamera();
    }
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

  const renderDeviceSpecificUI = () => {
    if (deviceInfo.hasLiveText) {
      return (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This device supports iOS Live Text! You can use your native camera app to:
            <ol style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
              <li>Open your iPhone camera</li>
              <li>Point at the receipt</li>
              <li>Tap and hold on detected text</li>
              <li>Copy and paste the text below</li>
            </ol>
          </Alert>
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={() => window.location.href = 'photos-redirect://'}
            sx={{ mb: 2 }}
          >
            Open Camera App
          </Button>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={scannedText}
            onChange={(e) => setScannedText(e.target.value)}
            placeholder="Paste your scanned receipt text here..."
            sx={{ mt: 2 }}
          />
        </Box>
      );
    }

    if (deviceInfo.hasMLKit) {
      return (
        <>
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

          <Alert severity="info" sx={{ mb: 2 }}>
            Tip: After taking a picture, you can also use Google Lens to extract text from it.
            <Button
              size="small"
              component="a"
              href="https://lens.google.com"
              target="_blank"
              sx={{ ml: 1 }}
            >
              Open Google Lens
            </Button>
          </Alert>

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
        </>
      );
    }

    return (
      <>
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
      </>
    );
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Receipt Scanner
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {renderDeviceSpecificUI()}
        </Box>
      </Paper>
    </Container>
  );
};

export default Receipts;
