import {
  BellOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CrownOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
  RocketOutlined,
  SnippetsOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Badge, Button, Drawer, Dropdown, Empty, Grid, Layout, List, Menu, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./AppLayout.css";

const { Header, Sider, Content } = Layout;

export function AppLayout({ auth }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const navItems = [
    {
      key: "/app/dashboard",
      icon: <PieChartOutlined />,
      label: <Link to="/app/dashboard">Главная</Link>
    },
    {
      key: "/app/onboarding",
      icon: <RocketOutlined />,
      label: <Link to="/app/onboarding">Старт</Link>
    },
    {
      key: "/app/control",
      icon: <BarChartOutlined />,
      label: <Link to="/app/control">Контроль</Link>
    },
    {
      key: "/app/calendar",
      icon: <CalendarOutlined />,
      label: <Link to="/app/calendar">Календарь</Link>
    },
    {
      key: "/app/overdue",
      icon: <ExclamationCircleOutlined />,
      label: <Link to="/app/overdue">Просроченные</Link>
    },
    {
      key: "/app/projects",
      icon: <FolderOpenOutlined />,
      label: <Link to="/app/projects">Проекты</Link>
    },
    {
      key: "/app/templates",
      icon: <SnippetsOutlined />,
      label: <Link to="/app/templates">Шаблоны</Link>
    },
    {
      key: "/app/billing",
      icon: <CreditCardOutlined />,
      label: <Link to="/app/billing">Тарифы</Link>
    },
    ...(auth.user?.isSuperAdmin
      ? [
          {
            key: "/app/admin",
            icon: <CrownOutlined />,
            label: <Link to="/app/admin">Админ</Link>
          }
        ]
      : []),
    {
      key: "/app/profile",
      icon: <UserOutlined />,
      label: <Link to="/app/profile">Профиль</Link>
    }
  ];

  function signOut() {
    auth.signOut();
    navigate("/", { replace: true });
  }

  async function loadNotifications({ silent = false } = {}) {
    try {
      const data = await apiFetch("/notifications");
      setNotifications(data.notifications);
    } catch (error) {
      if (!silent) {
        message.error(error.message);
      }
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  async function markNotificationRead(notification) {
    if (notification.read) return;

    try {
      await apiFetch(`/notifications/${notification._id}/read`, { method: "PATCH" });
      setNotifications((items) =>
        items.map((item) => (item._id === notification._id ? { ...item, read: true } : item))
      );
    } catch (error) {
      message.error(error.message);
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    } catch (error) {
      message.error(error.message);
    }
  }

  function handleNotificationKeyDown(event, notification) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      markNotificationRead(notification);
    }
  }

  const notificationsPanel = (
    <div className="app-layout__notifications">
      <div className="app-layout__notifications-head">
        <Typography.Text strong>Уведомления</Typography.Text>
        <Button type="link" size="small" onClick={markAllRead}>
          Прочитано
        </Button>
      </div>
      {notifications.length ? (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(notification) => {
	            const content = (
	              <List.Item
	                className={notification.read ? "app-layout__notification" : "app-layout__notification app-layout__notification--unread"}
	              >
	                <List.Item.Meta
                  title={notification.message}
                  description={
                    <span>
                      {notification.project?.name} · {dayjs(notification.createdAt).format("DD.MM.YYYY HH:mm")}
                    </span>
                  }
                />
              </List.Item>
            );
	
	            return notification.task?._id ? (
	              <Link
	                className="app-layout__notification-link"
	                to={`/app/tasks/${notification.task._id}`}
	                onClick={() => markNotificationRead(notification)}
	              >
	                {content}
	              </Link>
	            ) : (
	              <div
	                className="app-layout__notification-action"
	                role="button"
	                tabIndex={0}
	                onClick={() => markNotificationRead(notification)}
	                onKeyDown={(event) => handleNotificationKeyDown(event, notification)}
	              >
	                {content}
	              </div>
	            );
          }}
        />
      ) : (
        <Empty description="Уведомлений нет" />
      )}
    </div>
  );

  return (
    <Layout className="app-layout">
      {!isMobile && (
        <Sider width={252} collapsible collapsed={collapsed} trigger={null} className="app-layout__sider">
          <Link to="/app/dashboard" className="app-layout__brand">
            <BrandLogo compact={collapsed} variant="light" />
          </Link>
          <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={navItems} />
        </Sider>
      )}
      <Layout>
        <Header className="app-layout__header">
          <div className="app-layout__header-left">
            {isMobile ? (
              <>
                <Button
                  aria-label="Открыть меню"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                />
                <Link to="/app/dashboard" className="app-layout__mobile-brand">
                  <BrandLogo />
                </Link>
              </>
            ) : (
              <Button
                aria-label="Свернуть меню"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
              />
            )}
          </div>
          <div className="app-layout__user">
            <Dropdown dropdownRender={() => notificationsPanel} trigger={["click"]} placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <Button aria-label="Уведомления" icon={<BellOutlined />} />
              </Badge>
            </Dropdown>
            <div>
              <Typography.Text strong>{auth.user?.name}</Typography.Text>
              <Typography.Text type="secondary">{auth.user?.email}</Typography.Text>
            </div>
            <Button icon={<LogoutOutlined />} onClick={signOut}>
              Выйти
            </Button>
          </div>
        </Header>
        <Content className="app-layout__content">
          <Outlet />
        </Content>
      </Layout>
      <Drawer
        className="app-layout__drawer"
        title={<BrandLogo />}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        placement="left"
        width={280}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={() => setMobileMenuOpen(false)}
        />
      </Drawer>
    </Layout>
  );
}
