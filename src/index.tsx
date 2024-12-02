import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './client/App';
import { ThemeProvider } from './client/context/ThemeContext';
import { UserProvider } from './client/context/UserContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
