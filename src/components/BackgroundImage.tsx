import React, { useEffect, useState } from 'react';
import { UNSPLASH_CONFIG } from '../config/unsplash';
import { IconButton, CircularProgress } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const BackgroundImage: React.FC = () => {
    const [images, setImages] = useState<any[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                console.log('Fetching images...');
                const response = await fetch(
                    `https://api.unsplash.com/photos/random?query=${UNSPLASH_CONFIG.SEARCH_QUERY}&count=${UNSPLASH_CONFIG.COUNT}`,
                    {
                        headers: {
                            Authorization: `Client-ID ${UNSPLASH_CONFIG.ACCESS_KEY}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Images fetched:', data);
                setImages(data);
            } catch (err) {
                console.error('Error fetching images:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, []);

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (loading) {
        return (
            <div className="background-image" style={{ background: '#f0f0f0' }}>
                <CircularProgress 
                    sx={{ 
                        position: 'fixed', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)' 
                    }} 
                />
            </div>
        );
    }

    if (error || !images.length) {
        return (
            <div className="background-image">
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                }} />
            </div>
        );
    }

    const currentImage = images[currentImageIndex];

    return (
        <div className="background-image">
            <img
                src={currentImage.urls.regular}
                alt={currentImage.alt_description || 'Background'}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
            {images.length > 1 && (
                <>
                    <IconButton
                        onClick={handlePrevImage}
                        sx={{
                            position: 'fixed',
                            left: 20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' }
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleNextImage}
                        sx={{
                            position: 'fixed',
                            right: 20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' }
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </>
            )}
            <div className="photo-credit">
                Photo by{' '}
                <a 
                    href={currentImage.user.links.html} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'white' }}
                >
                    {currentImage.user.name}
                </a>
                {currentImage.location?.name && ` - ${currentImage.location.name}`}
            </div>
        </div>
    );
};

export default BackgroundImage;
