import React from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { loginApi } from '../api/auth';
import Logo from '../components/Logo';

const { Title } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await loginApi(values);
      message.success('Успешный вход');
      navigate('/app/tasks');
    } catch (e) {
      message.error(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Logo />
        </div>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Вход
        </Title>
        <Form layout="vertical" form={form} onFinish={handleFinish}>
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
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Войти
            </Button>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
