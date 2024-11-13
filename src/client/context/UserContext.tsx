import React, { createContext, useContext, useState, useEffect } from 'react';

import type { User } from '../../types';
import { validateToken } from '../api';
import { logger } from '../utils/frontendLogger';

interface UserContextType {
  user: User | null | undefined;
  setUser: React.Dispatch<React.SetStateAction<User | null | undefined>>;
}

const defaultSetUser: React.Dispatch<React.SetStateAction<User | null | undefined>> = () => {
  logger.warn('UserContext not initialized');
};

const UserContext = createContext<UserContextType>({
  user: undefined,
  setUser: defaultSetUser,
});

const devUser: User = {
  id: 'dev',
  username: 'dev',
  role: 'admin',
  is_active: true,
  email: 'dev@example.com',
  lastLogin: new Date(),
  createdAt: new Date(),
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      // If auth is disabled, set dev user immediately without any API calls
      if (process.env.REACT_APP_DISABLE_AUTH === 'true') {
        logger.info('Auth disabled, using dev user');
        setUser(devUser);
        return;
      }

      try {
        logger.info('Validating auth token');
        const result = await validateToken();
        if (result.success && result.data) {
          logger.info('Token validation successful');
          setUser(result.data);
        } else {
          logger.warn('Token validation failed', { error: result.error });
          setUser(null);
        }
      } catch (error) {
        logger.error('Auth check failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setUser(null);
      }
    };

    void checkAuth();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => useContext(UserContext);
