import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import './RegisterPage.css';

const { Title, Paragraph } = Typography;

function RegisterPage({ onRegister, error, onBackToLogin, onBackHome }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      await onRegister?.({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <Card className="register-card">
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Регистрация в TaskSpot
        </Title>
        <Paragraph
          type="secondary"
          style={{ textAlign: 'center', marginBottom: 16 }}
        >
          Создайте аккаунт по email и начните управлять задачами.
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
            label="Имя"
            name="name"
            rules={[
              { required: true, message: 'Введите имя' },
              { max: 100, message: 'Максимум 100 символов' },
            ]}
          >
            <Input placeholder="Как к вам обращаться" />
          </Form.Item>

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
              { min: 4, message: 'Минимум 4 символа' },
            ]}
          >
            <Input.Password placeholder="Придумайте пароль" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              Зарегистрироваться
            </Button>
          </Form.Item>

          <div className="register-links">
            <Button type="link" size="small" onClick={onBackToLogin}>
              Уже есть аккаунт
            </Button>
            <Button type="link" size="small" onClick={onBackHome}>
              На главную
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default RegisterPage;
