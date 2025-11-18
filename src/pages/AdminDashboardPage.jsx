import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Form,
  Input,
  Switch,
  Button,
  message,
} from 'antd';
import {
  fetchGlobalStatsApi,
  fetchLandingMetricsApi,
  fetchUsersAdminApi,
  createUserAdminApi,
} from '../api/admin';

const { Title, Text } = Typography;

function AdminDashboardPage() {
  const [globalStats, setGlobalStats] = useState(null);
  const [landingStats, setLandingStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      try {
        const [global, landing] = await Promise.all([
          fetchGlobalStatsApi(),
          fetchLandingMetricsApi(),
        ]);
        setGlobalStats(global);
        setLandingStats(landing);
      } catch (e) {
        console.error(e);
        message.error('Не удалось загрузить статистику');
      } finally {
        setLoadingStats(false);
      }
    }

    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const data = await fetchUsersAdminApi();
        setUsers(data);
      } catch (e) {
        console.error(e);
        message.error('Не удалось загрузить пользователей');
      } finally {
        setLoadingUsers(false);
      }
    }

    loadStats();
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      const values = await form.validateFields();
      setCreatingUser(true);
      const created = await createUserAdminApi({
        name: values.name,
        email: values.email,
        password: values.password,
        isAdmin: values.isAdmin || false,
      });
      setUsers((prev) => [...prev, { ...created, stats: { projectsCount: 0, tasksCount: 0 } }]);
      form.resetFields();
      message.success('Пользователь создан');
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось создать пользователя');
    } finally {
      setCreatingUser(false);
    }
  };

  const userColumns = [
    {
      title: 'Имя',
      dataIndex: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'isAdmin',
      render: (val) => (val ? 'Админ' : 'Пользователь'),
    },
    {
      title: 'Проекты',
      dataIndex: ['stats', 'projectsCount'],
      render: (val) => val ?? 0,
    },
    {
      title: 'Задачи (исполн.)',
      dataIndex: ['stats', 'tasksCount'],
      render: (val) => val ?? 0,
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={4}>Админский дашборд</Title>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Сводка по сервису" loading={loadingStats}>
            {globalStats && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Пользователей"
                    value={globalStats.usersCount}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Проектов"
                    value={globalStats.projectsCount}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Задач всего"
                    value={globalStats.tasksCount}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Просроченных задач"
                    value={globalStats.tasksOverdue}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Активных проектов"
                    value={globalStats.activeProjects}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Завершённых проектов"
                    value={globalStats.completedProjects}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Лендинг TaskSpot" loading={loadingStats}>
            {landingStats && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Просмотры"
                    value={landingStats.visits}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Клики по регистрации"
                    value={landingStats.registerClicks}
                  />
                </Col>
                <Col span={24}>
                  <Statistic
                    title="Конверсия в клик регистрации"
                    value={landingStats.conversion}
                    suffix="%"
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="Пользователи"
            loading={loadingUsers}
          >
            <Table
              rowKey="_id"
              dataSource={users}
              columns={userColumns}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Создать пользователя">
            <Form layout="inline" form={form}>
              <Form.Item
                label="Имя"
                name="name"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input placeholder="Имя" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[
                  { required: true, message: 'Введите пароль' },
                  { min: 6, message: 'Минимум 6 символов' },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="Админ"
                name="isAdmin"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleCreateUser}
                  loading={creatingUser}
                >
                  Создать
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminDashboardPage;
