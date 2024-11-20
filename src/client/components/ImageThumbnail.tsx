import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';
import { useLazyImage } from '../hooks/useLazyImage';

interface ImageThumbnailProps {
  src: string;
  alt: string;
  size?: number;
  onClick?: () => void;
}

export function ImageThumbnail({
  src,
  alt,
  size = 100,
  onClick,
}: ImageThumbnailProps) {
  const { isLoading, error, ref, isVisible } = useLazyImage({
    src,
    threshold: 0.1,
    rootMargin: '100px',
  });

  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        borderRadius: 1,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        '&:hover': onClick ? {
          '& img': {
            transform: 'scale(1.1)',
          },
        } : {},
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      {error ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ImageIcon color="disabled" />
          <Typography variant="caption" color="text.secondary">
            Failed to load
          </Typography>
        </Box>
      ) : (
        isVisible && (
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.2s ease-in-out',
              opacity: isLoading ? 0 : 1,
            }}
          />
        )
      )}
    </Box>
  );
}
