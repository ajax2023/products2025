import { useState } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

const Receipts = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={handleCapture}
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
