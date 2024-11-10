import React from 'react';
import { Navigate } from 'react-router-dom';

import LoadingScreen from './LoadingScreen';
import { useUserContext } from '../context/UserContext';

interface PrivateRouteProps {
  children: React.ReactElement;
  requiredRole?: 'admin' | 'user' | 'viewer';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user } = useUserContext();

  // Show loading screen while checking authentication
  if (user === undefined) {
    return <LoadingScreen fullscreen message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <Navigate
        to="/"
        replace
        state={{ error: `Access denied. ${requiredRole} role required.` }}
      />
    );
  }

  return children;
};

export default PrivateRoute;
