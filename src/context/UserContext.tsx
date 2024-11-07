import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, DEFAULT_USER_PREFERENCES } from '../types';

interface UserContextType {
  user: User | null;
  updateUserContext: (user: User) => void;
  clearUserContext: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};

interface UserContextProviderProps {
  children: React.ReactNode;
}

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        return {
          ...parsedUser,
          preferences: {
            ...DEFAULT_USER_PREFERENCES,
            ...parsedUser.preferences,
          },
        };
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });

  const updateUserContext = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const clearUserContext = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        updateUserContext,
        clearUserContext,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
