import React from 'react';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import './LoginPage.css';

const { Title, Paragraph } = Typography;

function LoginPage({ onLogin, error, onBackHome, onGoRegister }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    onLogin && onLogin(values.email.trim(), values.password);
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Вход в TaskSpot
        </Title>
        <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 16 }}>
          Используйте email и пароль, чтобы войти.
        </Paragraph>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: 'Введите пароль' },
            ]}
          >
            <Input.Password placeholder="Ваш пароль" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block>
              Войти
            </Button>
          </Form.Item>

          <div className="login-links">
            <Button type="link" size="small" onClick={onGoRegister}>
              Создать аккаунт
            </Button>
            <Button type="link" size="small" onClick={onBackHome}>
              На главную
            </Button>
          </div>

          <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
            Демо-аккаунты:<br />
            Админ: admin@example.com / admin<br />
            Пользователь: anna@example.com / password
          </Paragraph>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
