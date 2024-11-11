import React, { createContext, useContext, useState, useEffect } from 'react';

import type { User } from '../../types';
import { validateToken } from '../api';

interface UserContextType {
  user: User | null | undefined;
  setUser: React.Dispatch<React.SetStateAction<User | null | undefined>>;
}

const UserContext = createContext<UserContextType>({
  user: undefined,
  setUser: () => {}, // Default implementation
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      if (process.env.ENABLE_AUTH === 'false') {
        // Authentication disabled, set a dummy user
        setUser({
          id: -1,
          username: 'guest',
          email: 'guest@example.com',
          password: '',
        });
        return;
      }

      const result = await validateToken();
      if (result.success) {
        setUser(result.data);
      } else {
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
