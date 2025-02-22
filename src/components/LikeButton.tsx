import React, { useState, useCallback } from 'react';
import { IconButton, Badge } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { BrandLikesManager } from '../utils/brandLikes';
import { useAuth } from '../auth/useAuth';

interface LikeButtonProps {
  brandId: string;
  brandName: string;
  initialLikeCount: number;
}

export default function LikeButton({ brandId, brandName, initialLikeCount }: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(false);
  const { user } = useAuth();

  const handleLike = useCallback(async () => {
    try {
      const result = await BrandLikesManager.toggleLike(brandId, user?.uid);
      if (result.success) {
        setLikeCount(prev => prev + (result.action === 'like' ? 1 : -1));
        setIsLiked(result.action === 'like');
      }
    } catch (error) {
      console.error('[LikeButton] Error toggling like:', error);
    }
  }, [brandId, user?.uid]);

  return (
    <IconButton 
      onClick={handleLike}
      size="small"
      aria-label={isLiked ? `Unlike ${brandName}` : `Like ${brandName}`}
    >
      <Badge 
        badgeContent={likeCount} 
        color="primary"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.6rem',
            height: '16px',
            minWidth: '16px',
            padding: '0 4px'
          }
        }}
      >
        {isLiked ? (
          <FavoriteIcon sx={{ color: '#e91e63', fontSize: '1.2rem' }} />
        ) : (
          <FavoriteBorderIcon sx={{ color: '#757575', fontSize: '1.2rem' }} />
        )}
      </Badge>
    </IconButton>
  );
}
