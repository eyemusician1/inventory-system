import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import your pages
import DashboardPage from './pages/admin/Dashboard';
import LoginPage from './pages/admin/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* URL: localhost:5173/login */}
        <Route path="/login" element={<LoginPage />} />

        {/* URL: localhost:5173/ */}
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}