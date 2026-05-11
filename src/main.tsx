import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyTheme, readStoredTheme } from './lib/theme';

// Apply persisted theme synchronously, before React mounts, to prevent a
// light-flash on dark-preferring devices.
applyTheme(readStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
