import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdminDashboard } from './pages/AdminDashboard';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);

// Intercept /admin at the entry point -- before App mounts at all
const isAdminRoute = window.location.pathname.startsWith('/admin');

root.render(
  <React.StrictMode>
    {isAdminRoute ? <AdminDashboard /> : <App />}
  </React.StrictMode>
);
