import React, { useMemo } from 'react';
import {
  Layout,
  Menu,
  Card,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Form,
  Input,
  Button,
  Switch,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { STATUS_META } from '../../constants/statusMeta';
import './AdminDashboard.css';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

function AdminDashboard({
  users,
  projects,
  tasks,
  landingStats,
  adminSection,
  onSectionChange,
  onOpenTask,
  onCreateUser,
}) {
  const totalUsers = users.length;
  const totalProjects = projects.length;
  const totalTasks = tasks.length;

  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === STATUS_META.done.key ||
          t.status === STATUS_META.closed.key
      ).length,
    [tasks]
  );

  const avgCompletedPerUser = totalUsers
    ? (completedTasks / totalUsers).toFixed(1)
    : '0.0';

  const tasksByStatus = useMemo(
    () =>
      Object.values(STATUS_META).map((meta) => ({
        key: meta.key,
        label: meta.label,
        color: meta.color,
        count: tasks.filter((t) => t.status === meta.key).length,
      })),
    [tasks]
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        const d = dayjs(t.dueDate);
        if (!d.isValid()) return false;
        const isPast = d.isBefore(dayjs(), 'day');
        const isClosed = t.status === STATUS_META.closed.key;
        return isPast && !isClosed;
      }).length,
    [tasks]
  );

  const activeProjectsCount = projects.filter(
    (p) => p.status !== 'completed'
  ).length;
  const completedProjectsCount = projects.filter(
    (p) => p.status === 'completed'
  ).length;

  const visits = landingStats?.visits ?? 0;
  const registerClicks = landingStats?.registerClicks ?? 0;
  const conversion = visits
    ? ((registerClicks / visits) * 100).toFixed(1)
    : '0.0';

  const projectById = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      map[p._id] = p;
    });
    return map;
  }, [projects]);

  const userById = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u._id] = u;
    });
    return map;
  }, [users]);

  const tasksTableColumns = [
    {
      title: 'Проект',
      dataIndex: 'projectId',
      key: 'project',
      render: (projectId) =>
        projectById[projectId]?.name || '—',
    },
    {
      title: 'Задача',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span className="admin-task-title">{text}</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const meta = STATUS_META[status] || {};
        return (
          <Tag color={meta.color}>
            {meta.label || status}
          </Tag>
        );
      },
    },
    {
      title: 'Срок',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate) =>
        dueDate ? dayjs(dueDate).format('DD.MM.YYYY') : '—',
    },
    {
      title: 'Исполнитель',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee) =>
        assignee ? assignee.name : '—',
    },
    {
      title: 'Инициатор',
      dataIndex: 'creatorId',
      key: 'creator',
      render: (creatorId) => {
        const u = userById[creatorId];
        return u ? u.name : '—';
      },
    },
  ];

  const usersWithStats = useMemo(() => {
    return users.map((u) => {
      const userProjects = projects.filter(
        (p) =>
          p.ownerId === u._id ||
          (p.memberIds || []).includes(u._id)
      ).length;
      const userTasks = tasks.filter((t) => {
        const assigneeId =
          typeof t.assignee === 'string'
            ? t.assignee
            : t.assignee?._id;
        return assigneeId === u._id;
      }).length;

      return {
        ...u,
        projectsCount: userProjects,
        tasksCount: userTasks,
      };
    });
  }, [users, projects, tasks]);

  const usersColumns = [
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'isAdmin',
      key: 'role',
      render: (isAdmin) =>
        isAdmin ? (
          <Tag color="gold">Админ</Tag>
        ) : (
          <Tag>Пользователь</Tag>
        ),
    },
    {
      title: 'Проектов',
      dataIndex: 'projectsCount',
      key: 'projectsCount',
    },
    {
      title: 'Задач (исп.)',
      dataIndex: 'tasksCount',
      key: 'tasksCount',
    },
  ];

  const menuItems = [
    { key: 'stats', label: 'Статистика' },
    { key: 'tasks', label: 'Все задачи' },
    { key: 'users', label: 'Пользователи' },
  ];

  const [form] = Form.useForm();

  const handleCreateUser = (values) => {
    const success = onCreateUser?.({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      isAdmin: values.isAdmin || false,
    });
    if (success) {
      form.resetFields();
    }
  };

  return (
    <Layout className="admin-layout">
      <Sider
        className="admin-sider"
        breakpoint="lg"
        collapsedWidth={0}
      >
        <div className="admin-sider-title">
          Админ-панель
        </div>
        <Menu
          mode="inline"
          selectedKeys={[adminSection]}
          items={menuItems}
          onClick={(e) => onSectionChange && onSectionChange(e.key)}
        />
      </Sider>
      <Layout>
        <Content className="admin-content">
          {adminSection === 'stats' && (
            <div className="admin-section">
              <Title level={4}>Общая статистика сервиса</Title>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="Пользователей"
                      value={totalUsers}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="Проектов"
                      value={totalProjects}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="Задач всего"
                      value={totalTasks}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="Выполнено задач на пользователя"
                      value={Number(avgCompletedPerUser)}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                  <Card title="Задачи по статусам">
                    <div className="admin-status-tags">
                      {tasksByStatus.map((s) => (
                        <Tag
                          key={s.key}
                          color={s.color}
                          className="admin-status-tag"
                        >
                          {s.label}: {s.count}
                        </Tag>
                      ))}
                    </div>
                    <Text type="secondary">
                      Всего просроченных задач:{' '}
                      <Text type="danger">
                        {overdueTasks}
                      </Text>
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Проекты">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Statistic
                          title="Активные проекты"
                          value={activeProjectsCount}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Завершённые проекты"
                          value={completedProjectsCount}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary">
                        Можно использовать как сигнал, что старые проекты нужно архивировать.
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                  <Card title="Лендинг и конверсия регистрации">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Statistic
                          title="Просмотры лендинга"
                          value={visits}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Клики по регистрации"
                          value={registerClicks}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 12 }}>
                      <Statistic
                        title="Конверсия регистрации с лендинга, %"
                        value={Number(conversion)}
                      />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        В реальном сервисе эти данные пришли бы из аналитики (например, из бэкенда или внешней системы).
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Идеи для будущих метрик">
                    <ul className="admin-ideas-list">
                      <li>Активные пользователи за последние 7/30 дней</li>
                      <li>Средняя длина жизненного цикла задачи</li>
                      <li>Распределение задач по категориям и проектам</li>
                      <li>Нагрузку по пользователям (сколько задач в работе)</li>
                    </ul>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {adminSection === 'tasks' && (
            <div className="admin-section">
              <Title level={4}>Все задачи сервиса</Title>
              <Text type="secondary">
                Здесь отображаются задачи всех проектов, которые существуют в системе.
              </Text>
              <div style={{ marginTop: 12 }}>
                <Table
                  rowKey="_id"
                  columns={tasksTableColumns}
                  dataSource={tasks}
                  size="small"
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: () =>
                      onOpenTask && onOpenTask(record),
                  })}
                />
              </div>
            </div>
          )}

          {adminSection === 'users' && (
            <div className="admin-section">
              <Title level={4}>Пользователи</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                  <Card title="Создать пользователя">
                    <Form
                      layout="vertical"
                      form={form}
                      onFinish={handleCreateUser}
                    >
                      <Form.Item
                        label="Имя"
                        name="name"
                        rules={[
                          {
                            required: true,
                            message: 'Введите имя',
                          },
                        ]}
                      >
                        <Input placeholder="Имя пользователя" />
                      </Form.Item>
                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          {
                            required: true,
                            message: 'Введите email',
                          },
                          {
                            type: 'email',
                            message: 'Некорректный email',
                          },
                        ]}
                      >
                        <Input placeholder="user@example.com" />
                      </Form.Item>
                      <Form.Item
                        label="Пароль"
                        name="password"
                        rules={[
                          {
                            required: true,
                            message: 'Введите пароль',
                          },
                          {
                            min: 4,
                            message:
                              'Минимум 4 символа',
                          },
                        ]}
                      >
                        <Input.Password placeholder="Пароль" />
                      </Form.Item>
                      <Form.Item
                        label="Роль администратора"
                        name="isAdmin"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                        >
                          Создать
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={14}>
                  <Card title="Все пользователи">
                    <Table
                      rowKey="_id"
                      columns={usersColumns}
                      dataSource={usersWithStats}
                      size="small"
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminDashboard;
