import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppShell from './pages/AppShell';
import { getCurrentUserApi } from './api/auth';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const me = await getCurrentUserApi();
        if (isMounted) {
          setUser(me);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setUser(null);
          navigate('/login');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children(user);
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            {(user) => <AppShell currentUser={user} />}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
