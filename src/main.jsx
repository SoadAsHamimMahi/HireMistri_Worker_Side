// src/main.jsx or src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
// Leaflet CSS - imported globally for map components
import 'leaflet/dist/leaflet.css';

// Font Awesome (optional)
import '@fortawesome/fontawesome-free/css/all.min.css';

// Layout & Routes
import Root from './routes/Root';
import ErrorPage from './routes/ErrorPage';
import Dashboard from './routes/Dashboard';
import Jobs from './routes/Jobs';
import Applications from './routes/Applications';
import EditProfile from './routes/EditProfile';
import JobDetails from './routes/JobDetails'; // dynamic job preview
import WorkerLogin from './Authentication/WorkerLogin';
import WorkerRegister from './Authentication/WorkerRegister';
import AuthProvider from './Authentication/AuthProvider';
import WorkerJobDetails from './routes/WorkerJobDetails';
import RegistrationGuard from './components/RegistrationGuard';
import RegistrationPending from './routes/RegistrationPending';
import JobOffers from './routes/JobOffers';
import SavedJobs from './routes/SavedJobs';
import ClientProfile from './routes/ClientProfile';

import MessagesPaused from './routes/MessagesPaused';
import MessagesInbox from './routes/MessagesInbox';
import SupportInbox from './routes/Support/SupportInbox';
import DashboardLayout from './routes/DashboardLayout';
import Earnings from './routes/Earnings';
import Settings from './routes/Settings';
import PaymentStatus from './routes/PaymentStatus';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: '', element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: <RegistrationGuard><DashboardLayout /></RegistrationGuard>,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'applications', element: <Applications /> },
          { path: 'job-offers', element: <JobOffers /> },
          { path: 'earnings', element: <Earnings /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      { path: 'jobs', element: <Jobs /> },
      { path: 'saved-jobs', element: <SavedJobs /> },
      { path: 'edit-profile', element: <EditProfile /> },
      { path: 'payment-status', element: <PaymentStatus /> },
      { path: 'job/:jobId', element: <JobDetails /> },
      { path: 'login', element: <WorkerLogin /> },
      { path: 'register', element: <WorkerRegister /> },
      { path: 'registration', element: <WorkerRegister /> },
      { path: 'registration/pending', element: <RegistrationPending /> },
      { path: 'jobs/:id', element: <WorkerJobDetails /> },
      { path: 'client/:clientId', element: <ClientProfile /> },

      { path: 'messages', element: <MessagesPaused /> },
      { path: 'messages/:conversationId', element: <MessagesPaused /> },
      { path: 'chats', element: <MessagesInbox basePath="chats" /> },
      { path: 'chats/:conversationId', element: <MessagesInbox basePath="chats" /> },
      { path: 'support', element: <SupportInbox /> },
      { path: 'support/:ticketId', element: <SupportInbox /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DarkModeProvider>
      <AuthProvider>
        <ProfileProvider>
          <WebSocketProvider>
            <MessagesProvider>
              <RouterProvider router={router} />
            <Toaster position="top-right" />
            </MessagesProvider>
          </WebSocketProvider>
        </ProfileProvider>
      </AuthProvider>
    </DarkModeProvider>
  </React.StrictMode>
);
