import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Dropdown,
  Space,
  Button,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  LineChartOutlined,
  ProjectOutlined,
  UserOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { logoutApi } from '../api/auth';
import { fetchProjectsApi } from '../api/projects';
import TasksPage from './TasksPage';
import EfficiencyPage from './EfficiencyPage';
import ProjectsPage from './ProjectsPage';
import AdminDashboardPage from './AdminDashboardPage';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function AppShell({ currentUser, setCurrentUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [menuKey, setMenuKey] = useState('assigned');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchProjectsApi();
        setProjects(data);
        if (!currentProjectId && data.length > 0) {
          setCurrentProjectId(data[0]._id);
        }
      } catch (e) {
        console.error(e);
        message.error('Не удалось загрузить проекты');
      }
    }
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser]);

  const currentProject = useMemo(
    () => projects.find((p) => p._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const handleLogout = () => {
    logoutApi();
    setCurrentUser(null);
    navigate('/login');
  };

  const userMenu = (
    <Menu
      items={[
        {
          key: 'logout',
          label: 'Выйти',
          onClick: handleLogout,
        },
      ]}
    />
  );

  const isAdmin = !!currentUser?.isAdmin;

  const userItems = [
    {
      key: 'assigned',
      icon: <CheckCircleOutlined />,
      label: (
        <Space size={4}>
          <span>Исполняю</span>
        </Space>
      ),
    },
    {
      key: 'mine',
      icon: <AppstoreOutlined />,
      label: 'Мои задачи',
    },
    {
      key: 'overdue',
      icon: <HourglassOutlined />,
      label: (
        <span>
          Просроченные
        </span>
      ),
    },
    {
      key: 'efficiency',
      icon: <LineChartOutlined />,
      label: 'Эффективность',
    },
    {
      key: 'projects',
      icon: <ProjectOutlined />,
      label: 'Проекты',
    },
  ];

  const adminItems = [
    {
      key: 'admin-dashboard',
      icon: <DashboardOutlined />,
      label: 'Админ: дашборд',
    },
    ...userItems,
  ];

  const items = isAdmin ? adminItems : userItems;

  useEffect(() => {
    if (menuKey === 'admin-dashboard') {
      navigate('/app/admin');
    } else if (menuKey === 'projects') {
      navigate('/app/projects');
    } else if (menuKey === 'efficiency') {
      navigate('/app/efficiency');
    } else {
      navigate('/app/tasks');
    }
  }, [menuKey, navigate]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingInline: collapsed ? 0 : 16,
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background:
                'radial-gradient(circle at 30% 30%, #40a9ff, #722ed1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: 18,
            }}
          >
            TS
          </div>
          {!collapsed && (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
              TaskSpot
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[menuKey]}
          items={items}
          onClick={(info) => setMenuKey(info.key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            paddingInline: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Button
              type="text"
              onClick={() => setCollapsed((prev) => !prev)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text strong style={{ fontSize: 16 }}>
                {currentProject ? currentProject.name : 'Нет выбранного проекта'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isAdmin ? 'Администратор сервиса' : 'Пользователь'}
              </Text>
            </div>
          </div>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                gap: 8,
              }}
            >
              <Avatar icon={<UserOutlined />} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text strong>{currentUser?.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {currentUser?.email}
                </Text>
              </div>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ padding: 16 }}>
          <Routes>
            <Route
              path="tasks"
              element={
                <TasksPage
                  currentUser={currentUser}
                  projects={projects}
                  currentProject={currentProject}
                  setCurrentProjectId={setCurrentProjectId}
                  viewKey={menuKey}
                />
              }
            />
            <Route
              path="efficiency"
              element={<EfficiencyPage />}
            />
            <Route
              path="projects"
              element={
                <ProjectsPage
                  projects={projects}
                  setProjects={setProjects}
                  setCurrentProjectId={setCurrentProjectId}
                />
              }
            />
            <Route
              path="admin"
              element={<AdminDashboardPage />}
            />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppShell;
