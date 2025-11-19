import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Menu, Dropdown, Avatar, Typography, Space, Badge } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { logout } from '../api/auth';
import { fetchProjectsApi } from '../api/projects';
import TasksPage from './TasksPage';
import ProjectsPage from './ProjectsPage';
import AdminDashboardPage from './AdminDashboardPage';
import EfficiencyPage from './EfficiencyPage';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppShell({ currentUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [taskViewKey, setTaskViewKey] = useState('assigned'); // assigned | mine | overdue
  const [loadingProjects, setLoadingProjects] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const list = await fetchProjectsApi();
        setProjects(list);
        if (!currentProjectId && list.length > 0) {
          setCurrentProjectId(list[0]._id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, [currentProjectId]);

  const currentProject = useMemo(
    () => projects.find((p) => p._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Одно меню для пользователя + эффективность + админ
  const menuItems = useMemo(() => {
    const items = [
      {
        key: 'assigned',
        icon: <CheckCircleOutlined />,
        label: 'Исполняю',
        onClick: () => {
          setTaskViewKey('assigned');
          navigate('/app/tasks');
        },
      },
      {
        key: 'mine',
        icon: <UnorderedListOutlined />,
        label: 'Мои задачи',
        onClick: () => {
          setTaskViewKey('mine');
          navigate('/app/tasks');
        },
      },
      {
        key: 'overdue',
        icon: <FieldTimeOutlined />,
        label: (
          <Space>
            Просроченные
          </Space>
        ),
        onClick: () => {
          setTaskViewKey('overdue');
          navigate('/app/tasks');
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'projects',
        icon: <ProjectOutlined />,
        label: 'Проекты',
        onClick: () => navigate('/app/projects'),
      },
      {
        key: 'efficiency',
        icon: <DashboardOutlined />,
        label: 'Эффективность',
        onClick: () => navigate('/app/efficiency'),
      },
    ];

    if (currentUser.isAdmin) {
      items.push(
        {
          type: 'divider',
        },
        {
          key: 'admin',
          icon: <DashboardOutlined />,
          label: 'Админ-дэшборд',
          onClick: () => navigate('/app/admin'),
        }
      );
    }

    return items;
  }, [navigate, currentUser.isAdmin]);

  const selectedMenuKey = useMemo(() => {
    if (location.pathname.startsWith('/app/projects')) return 'projects';
    if (location.pathname.startsWith('/app/efficiency')) return 'efficiency';
    if (location.pathname.startsWith('/app/admin')) return 'admin';
    // tasks + viewKey
    return taskViewKey;
  }, [location.pathname, taskViewKey]);

  const userMenu = (
    <Menu
      items={[
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Выйти',
          onClick: handleLogout,
        },
      ]}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null} // отключаем встроенный триггер, оставляем только кнопку в хэдере
        style={{
          background: '#001529',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Logo size={18} />
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          style={{ borderRight: 0, paddingTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#000',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="app-header-flex"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 12,
            }}
          >
            <div
              className="app-header-left"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: 200,
                  }}
                >
                  {currentProject ? currentProject.name : 'Нет проекта'}
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                  }}
                >
                  {currentUser.isAdmin ? 'Администратор сервиса' : 'Пользователь'}
                </Text>
              </div>
            </div>
            <div
              className="app-header-right"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'flex-end',
                minWidth: 0,
              }}
            >
              <select
                value={currentProjectId || ''}
                onChange={(e) => setCurrentProjectId(e.target.value || null)}
                disabled={loadingProjects || projects.length === 0}
                style={{
                  maxWidth: 200,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #303030',
                  background: '#000',
                  color: '#fff',
                  fontSize: 12,
                }}
              >
                {projects.length === 0 ? (
                  <option value="">Нет проектов</option>
                ) : (
                  projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
              <Dropdown overlay={userMenu} trigger={['click']}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Avatar size={28} icon={<UserOutlined />} />
                  <Text
                    style={{
                      color: '#fff',
                      maxWidth: 120,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      fontSize: 12,
                    }}
                  >
                    {currentUser.name}
                  </Text>
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content
          style={{
            padding: 12,
            minHeight: 'calc(100vh - var(--header-height))',
          }}
        >
          <Routes>
            <Route
              path="tasks"
              element={
                <TasksPage
                  currentUser={currentUser}
                  projects={projects}
                  currentProject={currentProject}
                  setCurrentProjectId={setCurrentProjectId}
                  viewKey={taskViewKey}
                />
              }
            />
            <Route
              path="projects"
              element={
                <ProjectsPage
                  currentUser={currentUser}
                  projects={projects}
                  setProjects={setProjects}
                  currentProject={currentProject}
                />
              }
            />
            <Route
              path="efficiency"
              element={<EfficiencyPage currentUser={currentUser} />}
            />
            <Route
              path="admin"
              element={
                currentUser.isAdmin ? <AdminDashboardPage /> : <div>Нет доступа</div>
              }
            />
            <Route path="*" element={<TasksPage
              currentUser={currentUser}
              projects={projects}
              currentProject={currentProject}
              setCurrentProjectId={setCurrentProjectId}
              viewKey={taskViewKey}
            />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
