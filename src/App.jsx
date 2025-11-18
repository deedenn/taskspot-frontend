import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Spin, ConfigProvider, theme } from 'antd';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppShell from './pages/AppShell';
import { getAuthToken } from './api/client';
import { meApi } from './api/auth';

const { Header, Content } = Layout;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const user = await meApi();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    initAuth();
  }, []);

  useEffect(() => {
    if (!authChecking) {
      if (!currentUser && location.pathname.startsWith('/app')) {
        navigate('/login');
      }
      if (currentUser && (location.pathname === '/login' || location.pathname === '/register')) {
        navigate('/app');
      }
    }
  }, [authChecking, currentUser, location.pathname, navigate]);

  if (authChecking) {
    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ background: '#001529' }} />
          <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage onRegister={setCurrentUser} />} />
        <Route path="/app/*" element={<AppShell currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
