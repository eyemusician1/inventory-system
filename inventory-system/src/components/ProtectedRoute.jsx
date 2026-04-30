import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  // If there is no active user, intercept and redirect to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If they are an admin, allow them to view the protected component
  return children;
}