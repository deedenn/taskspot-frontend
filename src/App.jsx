import { Layout, Menu, Space, Typography, Button, Avatar } from 'antd';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DashboardOutlined, FolderOpenOutlined, ProjectOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { AppProvider, useApp } from './store/AppContext';
import Landing from './pages/Landing/Landing';
import Auth from './pages/Auth/Auth';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectsList from './pages/Projects/ProjectsList';
import ProjectDetails from './pages/Projects/ProjectDetails';
import TaskPage from './pages/Tasks/TaskPage';

const { Header, Content } = Layout;
const { Text } = Typography;

function Shell() {
    const { currentUser, logout } = useApp();
    const nav = useNavigate();
    const loc = useLocation();
    const key = loc.pathname.startsWith('/projects') ? 'projects' : loc.pathname.startsWith('/dashboard') ? 'dashboard' : 'landing';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Space style={{ minWidth: 0 }}>
                    <FolderOpenOutlined style={{ fontSize: 22 }} />
                    <Text style={{ fontWeight: 600 }} className="logo-text">Taskspot</Text>
                </Space>
                <Menu
                    mode="horizontal"
                    selectedKeys={[key]}
                    style={{ marginLeft: 24, flex: 1, minWidth: 0 }}
                    onClick={(e) => {
                        if (e.key === 'landing') nav('/');
                        if (e.key === 'dashboard') nav('/dashboard');
                        if (e.key === 'projects') nav('/projects');
                    }}
                    items={[
                        { key: 'landing', label: 'Главная', icon: <ProjectOutlined /> },
                        ...(currentUser ? [
                            { key: 'dashboard', label: 'Дашборд', icon: <DashboardOutlined /> },
                            { key: 'projects', label: 'Проекты', icon: <ProjectOutlined /> },
                        ] : []),
                    ]}
                />
                {currentUser && (
                    <Space wrap>
                        <Avatar icon={<UserOutlined />} />
                        <Text className="user-name">{currentUser.name}</Text>
                        <Button size="small" icon={<LogoutOutlined />} onClick={logout}>Выйти</Button>
                    </Space>
                )}
            </Header>
            <Content className="ts-content">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projects" element={<ProjectsList />} />
                    <Route path="/projects/:id" element={<ProjectDetails />} />
                    <Route path="/tasks/:id" element={<TaskPage />} />
                    <Route path="*" element={<Landing />} />
                </Routes>
            </Content>
        </Layout>
    );
}

export default function App() {
    return (
        <AppProvider>
            <Shell />
        </AppProvider>
    );
}