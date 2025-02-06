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
                console.log('Fetching images from Unsplash...');
                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(UNSPLASH_CONFIG.SEARCH_QUERY)}&per_page=${UNSPLASH_CONFIG.COUNT}&orientation=landscape`,
                    {
                        headers: {
                            Authorization: `Client-ID ${UNSPLASH_CONFIG.ACCESS_KEY}`
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Unsplash Images Fetched:', data.results);

                if (data.results.length === 0) {
                    throw new Error('No images found.');
                }

                // Shuffle the images array
                const shuffledImages = [...data.results].sort(() => Math.random() - 0.5);
                setImages(shuffledImages);
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
    const photographerUrl = `${currentImage.user.links.html}?utm_source=products2025&utm_medium=referral`;
    const unsplashUrl = "https://unsplash.com/?utm_source=products2025&utm_medium=referral";

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
            <div className="photo-credit" style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
                width: '250px',
            }}>
                Photo by <a href={photographerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}>{currentImage.user.name}</a> on <a href={unsplashUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}>Unsplash</a>
            </div>
            {images.length > 1 && (
                <>
                    <IconButton
                        onClick={handlePrevImage}
                        sx={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleNextImage}
                        sx={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </>
            )}
        </div>
    );
};

export default BackgroundImage;
