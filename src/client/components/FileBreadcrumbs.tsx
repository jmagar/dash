import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface FileBreadcrumbsProps {
  hostId: string;
  path: string;
}

export function FileBreadcrumbs({ hostId, path }: FileBreadcrumbsProps) {
  const navigate = useNavigate();
  
  // Split path into segments and create breadcrumb items
  const segments = path.split('/').filter(Boolean);
  const breadcrumbItems = segments.map((segment, index) => {
    // Build the path up to this segment
    const segmentPath = '/' + segments.slice(0, index + 1).join('/');
    
    return {
      name: segment,
      path: segmentPath,
    };
  });

  // Add root item
  breadcrumbItems.unshift({ name: 'Root', path: '/' });

  const handleClick = (path: string) => {
    navigate(`/files/${hostId}${path}`);
  };

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="file system navigation"
      sx={{ 
        padding: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return isLast ? (
          <Typography
            key={item.path}
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {item.name}
          </Typography>
        ) : (
          <Link
            key={item.path}
            component="button"
            variant="body1"
            onClick={() => handleClick(item.path)}
            sx={{
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {item.name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
