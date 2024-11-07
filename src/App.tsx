import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Components
import Dashboard from 'src/components/Dashboard';
import FileExplorer from 'src/components/FileExplorer';
import Login from 'src/components/Login';
import Navigation from 'src/components/Navigation';
import PackageManager from 'src/components/PackageManager';
import RemoteExecution from 'src/components/RemoteExecution';
import Terminal from 'src/components/Terminal';
import UserProfile from 'src/components/UserProfile';

// Types
import { User } from 'src/types';

// Utility for theme creation
const createAppTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#90caf9' : '#1976d2',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f4f4f4',
      paper: mode === 'dark' ? '#1d1d1d' : '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          scrollbar-width: thin;
          scrollbar-color: ${mode === 'dark' ? '#6b6b6b #2b2b2b' : '#d1d1d1 #f4f4f4'};
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${mode === 'dark' ? '#2b2b2b' : '#f4f4f4'};
        }
        ::-webkit-scrollbar-thumb {
          background-color: ${mode === 'dark' ? '#6b6b6b' : '#d1d1d1'};
          border-radius: 4px;
        }
      `,
    },
  },
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Check authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // TODO: Implement token validation and user fetch
      // For now, just set a placeholder user
      setUser({
        id: 1,
        uuid: 'placeholder-uuid',
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'user',
        preferredLanguage: 'en',
        isActive: true,
        lastLogin: new Date(),
        mfaEnabled: false,
        gdprCompliant: true,
      });
    }
  }, []);

  // Update theme based on user preferences
  useEffect(() => {
    if (user) {
      // TODO: Implement actual theme preference retrieval
      setTheme('light');
    }
  }, [user]);

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const appTheme = createAppTheme(theme);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          {user && <Navigation />}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              backgroundColor: appTheme.palette.background.default,
              minHeight: '100vh',
            }}
          >
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

              {user && (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/file-explorer" element={<FileExplorer />} />
                  <Route path="/package-manager" element={<PackageManager />} />
                  <Route path="/remote-execution" element={<RemoteExecution />} />
                  <Route path="/terminal" element={<Terminal />} />
                  <Route
                    path="/profile"
                    element={
                      <UserProfile
                        user={user}
                        onUpdateUser={handleUpdateUser}
                      />
                    }
                  />
                </>
              )}

              {/* Catch-all route */}
              <Route
                path="*"
                element={user ? <Navigate to="/" /> : <Navigate to="/login" />}
              />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
