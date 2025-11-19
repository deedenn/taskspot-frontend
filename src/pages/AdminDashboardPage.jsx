import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Typography,
  Spin,
  Form,
  Input,
  Button,
  Switch,
  message,
} from 'antd';
import { fetchGlobalStatsApi, fetchUsersApi, createUserApi } from '../api/admin';

const { Title } = Typography;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      try {
        const data = await fetchGlobalStatsApi();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStats(false);
      }
    }
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const list = await fetchUsersApi();
        setUsers(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadStats();
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      const values = await createForm.validateFields();
      setCreatingUser(true);
      const created = await createUserApi(values);
      setUsers((prev) => [...prev, created]);
      createForm.resetFields();
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
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Админ',
      dataIndex: 'isAdmin',
      key: 'isAdmin',
      render: (v) => (v ? 'Да' : 'Нет'),
    },
  ];

  return (
    <div>
      <Title level={4}>Админ-дэшборд</Title>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Пользователи"
              value={stats?.usersCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Проекты"
              value={stats?.projectsCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Задачи"
              value={stats?.tasksCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Просроченных задач"
              value={stats?.tasksOverdue ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Активные проекты"
              value={stats?.activeProjects ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card loading={loadingStats}>
            <Statistic
              title="Завершённые проекты"
              value={stats?.completedProjects ?? 0}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={24} md={10}>
          <Card title="Создать пользователя">
            <Form layout="vertical" form={createForm}>
              <Form.Item
                label="Имя"
                name="name"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="Администратор"
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
        <Col xs={24} md={14}>
          <Card title="Пользователи">
            {loadingUsers ? (
              <div
                style={{
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Spin />
              </div>
            ) : (
              <Table
                dataSource={users}
                columns={userColumns}
                rowKey="_id"
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
