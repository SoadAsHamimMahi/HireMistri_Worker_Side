// src/main.jsx or src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
// Leaflet CSS - imported globally for map components
import 'leaflet/dist/leaflet.css';

// Font Awesome (optional)
import '@fortawesome/fontawesome-free/css/all.min.css';

// Layout & Routes
import Root from './routes/Root';
import ErrorPage from './routes/ErrorPage';
import Home from './routes/Home';
import Dashboard from './routes/Dashboard';
import Jobs from './routes/Jobs';
import Applications from './routes/Applications';
import Orders from './routes/Orders';
import EditProfile from './routes/EditProfile';
import JobDetails from './routes/JobDetails'; // dynamic job preview
import WorkerLogin from './Authentication/WorkerLogin';
import WorkerRegister from './Authentication/WorkerRegister';
import AuthProvider from './Authentication/AuthProvider';
import WorkerJobDetails from './routes/WorkerJobDetails';
import SavedJobs from './routes/SavedJobs';
import ClientProfile from './routes/ClientProfile';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: '', element: <Home /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'jobs', element: <Jobs /> },
      { path: 'saved-jobs', element: <SavedJobs /> },
      { path: 'applications', element: <Applications /> },
      { path: 'orders', element: <Orders /> },
      { path: 'edit-profile', element: <EditProfile /> },
      { path: 'job/:jobId', element: <JobDetails /> },
      { path: 'login', element: <WorkerLogin /> },
      { path: 'registration', element: <WorkerRegister /> },
      { path: 'jobs/:id', element: <WorkerJobDetails /> },
      { path: 'client/:clientId', element: <ClientProfile /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DarkModeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <MessagesProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" />
          </MessagesProvider>
        </WebSocketProvider>
      </AuthProvider>
    </DarkModeProvider>
  </React.StrictMode>
);
