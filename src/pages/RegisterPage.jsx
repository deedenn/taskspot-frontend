import React, { useEffect } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { registerApi } from '../api/auth';
import { getInviteInfoApi } from '../api/projects';
import Logo from '../components/Logo';

const { Title, Paragraph } = Typography;

export default function RegisterPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [inviteInfo, setInviteInfo] = React.useState(null);

  const inviteToken = search.get('invite') || undefined;

  useEffect(() => {
    if (!inviteToken) return;
    getInviteInfoApi(inviteToken)
      .then(setInviteInfo)
      .catch(() => {});
  }, [inviteToken]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await registerApi({
        ...values,
        inviteToken,
      });
      message.success('Регистрация успешна');
      navigate('/app/tasks');
    } catch (e) {
      message.error(e.message || 'Ошибка регистрации');
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
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Logo />
        </div>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Регистрация
        </Title>
        {inviteInfo && (
          <Paragraph type={inviteInfo.expired ? 'danger' : 'secondary'} style={{ fontSize: 13 }}>
            Приглашение в проект «{inviteInfo.projectName}» для {inviteInfo.email}
            {inviteInfo.expired ? ' (срок действия истёк)' : ''}.
          </Paragraph>
        )}
        <Form layout="vertical" form={form} onFinish={handleFinish}>
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
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Зарегистрироваться
            </Button>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
