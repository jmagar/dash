import React, { createContext, useContext, useState, useEffect } from 'react';

import type { User } from '../../types';
import { validateToken } from '../api';

interface UserContextType {
  user: User | null | undefined;
  setUser: React.Dispatch<React.SetStateAction<User | null | undefined>>;
}

const defaultSetUser: React.Dispatch<React.SetStateAction<User | null | undefined>> = () => {
  console.warn('UserContext not initialized');
};

const UserContext = createContext<UserContextType>({
  user: undefined,
  setUser: defaultSetUser,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      // If auth is disabled, set dev user immediately without any API calls
      if (process.env.REACT_APP_DISABLE_AUTH === 'true') {
        setUser({
          id: 'dev',
          username: 'dev',
          role: 'admin',
        });
        return;
      }

      try {
        const result = await validateToken();
        if (result.success) {
          setUser(result.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
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
