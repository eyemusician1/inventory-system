import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'; // Import Theme
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import LandingPage from './pages/admin/LandingPage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/Dashboard';
import AddEquipmentPage from './pages/admin/AddEquipment';
import ReviewBorrowLogs from './pages/admin/ReviewBorrowLogs';
import GenerateReports from './pages/admin/GenerateReports';
import BorrowFormPage from './pages/public/BorrowFormPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/equipment" element={<ProtectedRoute><AddEquipmentPage /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><ReviewBorrowLogs /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><GenerateReports /></ProtectedRoute>} />
            {/* NEW: Public Borrowing Route (No ProtectedRoute wrapper) */}
            <Route path="/borrow/:id" element={<BorrowFormPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}