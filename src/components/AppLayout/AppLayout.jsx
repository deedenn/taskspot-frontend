import { GlobalSearch } from "./GlobalSearch.jsx";
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
  RiseOutlined,
  SnippetsOutlined,
  UserOutlined
} from "@ant-design/icons";
import { App as AntApp, Badge, Button, Drawer, Dropdown, Empty, Grid, Layout, List, Menu, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { fullName } from "../../utils/users.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./AppLayout.css";

const { Header, Sider, Content } = Layout;

function selectedMenuKey(pathname) {
  if (pathname.startsWith("/app/projects")) return "/app/projects";
  if (pathname.startsWith("/app/tasks")) return "/app/dashboard";
  if (pathname.startsWith("/app/control/assignees")) return "/app/control/assignees";
  if (pathname.startsWith("/app/control")) return "/app/control";
  if (pathname.startsWith("/app/efficiency")) return "/app/efficiency";
  if (pathname.startsWith("/app/calendar")) return "/app/calendar";
  if (pathname.startsWith("/app/overdue")) return "/app/overdue";
  if (pathname.startsWith("/app/templates")) return "/app/templates";
  if (pathname.startsWith("/app/billing")) return "/app/billing";
  if (pathname.startsWith("/app/profile")) return "/app/profile";
  if (pathname.startsWith("/app/admin")) return "/app/admin";
  return "/app/dashboard";
}

function localizeNotificationMessage(messageText = "") {
  const rules = [
    {
      pattern: /^You were assigned a task in "(.+)"$/,
      format: ([projectName]) => `Вам назначена задача в проекте «${projectName}»`
    },
    {
      pattern: /^Task "(.+)" is ready for review$/,
      format: ([taskDescription]) => `Задача «${taskDescription}» ожидает проверки`
    },
    {
      pattern: /^Task "(.+)" was closed$/,
      format: ([taskDescription]) => `Задача «${taskDescription}» закрыта`
    },
    {
      pattern: /^Task "(.+)" was sent back to work$/,
      format: ([taskDescription]) => `Задача «${taskDescription}» возвращена на доработку`
    },
    {
      pattern: /^New comment in task "(.+)"$/,
      format: ([taskDescription]) => `Новый комментарий в задаче «${taskDescription}»`
    }
  ];

  for (const rule of rules) {
    const match = String(messageText).match(rule.pattern);

    if (match) {
      return rule.format(match.slice(1));
    }
  }

  return messageText;
}

export function AppLayout({ auth }) {
  const { message, modal } = AntApp.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const lastLimitNotice = useRef({ signature: "", shownAt: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const isSuperAdmin = Boolean(auth.user?.isSuperAdmin);
  const homePath = auth.user?.mustChangePassword ? "/app/profile" : isSuperAdmin ? "/app/admin" : "/app/dashboard";
  const activeMenuKey = selectedMenuKey(location.pathname);
  const currentRoute = `${location.pathname}${location.search}`;

  const navItems = isSuperAdmin
    ? [
        ...(!auth.user?.mustChangePassword ? [{
          key: "/app/admin",
          icon: <CrownOutlined />,
          label: <Link to="/app/admin">Админ-панель</Link>
        }] : []),
        {
          key: "/app/profile",
          icon: <UserOutlined />,
          label: <Link to="/app/profile">Профиль</Link>
        }
      ]
    : [
        {
          key: "/app/dashboard",
          icon: <PieChartOutlined />,
          label: <Link to="/app/dashboard">Главная</Link>
        },
        {
          key: "control-group",
          icon: <BarChartOutlined />,
          label: "Контроль",
          children: [
            { key: "/app/control", label: <Link to="/app/control">Обзор</Link> },
            { key: "/app/control/assignees", label: <Link to="/app/control/assignees">По ответственным</Link> }
          ]
        },
        {
          key: "/app/efficiency",
          icon: <RiseOutlined />,
          label: <Link to="/app/efficiency">Эффективность</Link>
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

  useEffect(() => {
    if (isSuperAdmin) return undefined;

    function showPlanLimit(event) {
      const detail = event.detail || {};
      const signature = [detail.organization?.id, detail.key, detail.usage?.used, detail.usage?.limit].join(":");
      const now = Date.now();

      if (lastLimitNotice.current.signature === signature && now - lastLimitNotice.current.shownAt < 1500) return;
      lastLimitNotice.current = { signature, shownAt: now };

      modal.confirm({
        title: detail.reason === "subscription_expired"
          ? "Срок оплаченного тарифа закончился"
          : "Действие недоступно на текущем тарифе",
        content: detail.message || "Лимит текущего тарифа исчерпан. Перейдите на другой тариф, чтобы продолжить работу.",
        okText: "Перейти в тарифы",
        cancelText: "Позже",
        onOk: () => navigate("/app/billing")
      });
    }

    window.addEventListener("taskspot:plan-limit", showPlanLimit);
    return () => window.removeEventListener("taskspot:plan-limit", showPlanLimit);
  }, [isSuperAdmin, modal, navigate]);

  async function loadNotifications({ silent = false } = {}) {
    if (isSuperAdmin) {
      setNotifications([]);
      return;
    }

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
    if (isSuperAdmin) return undefined;

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isSuperAdmin]);

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
                  title={localizeNotificationMessage(notification.message)}
                  description={
                    <span>
                      {notification.project?.name || notification.organization?.name || "Taskspot"} · {dayjs(notification.createdAt).format("DD.MM.YYYY HH:mm")}
                    </span>
                  }
                />
              </List.Item>
            );
	
	            return notification.task?._id ? (
	              <Link
                className="app-layout__notification-link"
                to={`/app/tasks/${notification.task._id}`}
                state={{ returnTo: currentRoute }}
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
    <Layout className="app-layout ym-hide-content">
      {!isMobile && (
        <Sider width={252} collapsible collapsed={collapsed} trigger={null} className="app-layout__sider">
          <Link to={homePath} className="app-layout__brand">
            <BrandLogo compact={collapsed} variant="light" />
          </Link>
          <Menu theme="dark" mode="inline" selectedKeys={[activeMenuKey]} defaultOpenKeys={["control-group"]} items={navItems} />
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
                <Link to={homePath} className="app-layout__mobile-brand">
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
          {!isSuperAdmin && <GlobalSearch />}
          <div className="app-layout__user">
            {!isSuperAdmin && (
              <Dropdown dropdownRender={() => notificationsPanel} trigger={["click"]} placement="bottomRight">
                <Badge count={unreadCount} size="small">
                  <Button aria-label="Уведомления" icon={<BellOutlined />} />
                </Badge>
              </Dropdown>
            )}
            <div>
              <Typography.Text strong>{fullName(auth.user)}</Typography.Text>
              <Typography.Text type="secondary">{auth.user?.email}</Typography.Text>
            </div>
            <Button icon={<LogoutOutlined />} onClick={signOut}>
              Выйти
            </Button>
          </div>
        </Header>
        <Content className="app-layout__content">
          <Outlet />
          <footer className="app-layout__legal"><Link to="/legal/terms">Пользовательское соглашение</Link><Link to="/legal/privacy">Персональные данные</Link></footer>
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
          selectedKeys={[activeMenuKey]} defaultOpenKeys={["control-group"]}
          items={navItems}
          onClick={() => setMobileMenuOpen(false)}
        />
      </Drawer>
    </Layout>
  );
}
