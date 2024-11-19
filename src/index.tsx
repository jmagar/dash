import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './client/App';
import { ThemeProvider } from './client/context/ThemeContext';
import { UserProvider } from './client/context/UserContext';
import './client/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <UserProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </UserProvider>
  </React.StrictMode>,
);
