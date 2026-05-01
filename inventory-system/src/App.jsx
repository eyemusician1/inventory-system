import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'; // Import Theme
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages (lazy-loaded for smaller initial bundle)
const LandingPage = lazy(() => import('./pages/admin/LandingPage'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/Dashboard'));
const AddEquipmentPage = lazy(() => import('./pages/admin/AddEquipment'));
const ReviewBorrowLogs = lazy(() => import('./pages/admin/ReviewBorrowLogs'));
const GenerateReports = lazy(() => import('./pages/admin/GenerateReports'));
const BorrowFormPage = lazy(() => import('./pages/public/BorrowFormPage'));

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-[#050B14]"></div>}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}