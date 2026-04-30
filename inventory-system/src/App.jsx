import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import Context and Guard
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import LandingPage from './pages/admin/LandingPage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/Dashboard';
import AddEquipmentPage from './pages/admin/AddEquipment';
import ReviewBorrowLogs from './pages/admin/ReviewBorrowLogs';
import GenerateReports from './pages/admin/GenerateReports';

export default function App() {
  return (
    // Wrap the entire app so auth state is available everywhere
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Locked Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Locked Equipment Management Route */}
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <AddEquipmentPage />
              </ProtectedRoute>
            }
          />

          {/* Locked Borrow Logs Route */}
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <ReviewBorrowLogs />
              </ProtectedRoute>
            }
          />

          {/* Locked Reports Route */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <GenerateReports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}