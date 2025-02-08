import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material';

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface CameraDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string) => void;
}

export default function CameraDialog({ open, onClose, onCapture }: CameraDialogProps) {
  const [cameras, setCameras] = useState<VideoDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getCameras = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${devices.indexOf(device) + 1}`
          }));

        stream.getTracks().forEach(track => track.stop());

        setCameras(videoDevices);
        
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

    if (open) {
      getCameras();
    }
  }, [open]);

  useEffect(() => {
    const startCamera = async () => {
      if (selectedCamera && open) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedCamera },
            audio: false
          });
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
        } catch (error) {
          console.error('Error starting camera:', error);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCamera, open]);

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    localStorage.setItem('preferredCamera', deviceId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTakePicture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageUrl(dataUrl);
      }
    }
  };

  const handleConfirm = () => {
    if (imageUrl) {
      onCapture(imageUrl);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setImageUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Take Picture</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
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

          <Box sx={{ width: '100%', position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%' }}>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={handleTakePicture}
            >
              Take Picture
            </Button>
            {imageUrl && (
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => setImageUrl(null)}
              >
                Retake
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!imageUrl}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
