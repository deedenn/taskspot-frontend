import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { registerApi } from '../api/auth';
import { getInviteInfoApi } from '../api/projects';

const { Title, Text } = Typography;

function RegisterPage({ onRegister }) {
  const [searchParams] = useSearchParams();
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const inviteToken = searchParams.get('invite') || undefined;

  useEffect(() => {
    async function loadInvite() {
      if (!inviteToken) return;
      try {
        const info = await getInviteInfoApi(inviteToken);
        setInviteInfo(info);
      } catch (e) {
        setInviteError(e.message || 'Приглашение не найдено или истекло');
      }
    }
    loadInvite();
  }, [inviteToken]);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const data = await registerApi({
        ...values,
        inviteToken,
      });
      onRegister && onRegister(data.user);
      navigate('/app');
    } catch (e) {
      setError(e.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 440, width: '100%' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Регистрация в TaskSpot
        </Title>

        {inviteToken && (
          <>
            {inviteError && (
              <Alert
                type="error"
                message={inviteError}
                style={{ marginBottom: 16 }}
              />
            )}
            {inviteInfo && (
              <Alert
                type={inviteInfo.expired ? 'warning' : 'success'}
                message={
                  inviteInfo.expired
                    ? 'Срок действия приглашения истёк'
                    : `Приглашение в проект "${inviteInfo.projectName}"`
                }
                description={
                  inviteInfo.expired
                    ? undefined
                    : `Регистрация на email: ${inviteInfo.email}`
                }
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        {error && (
          <Alert
            type="error"
            message={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
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
            initialValue={inviteInfo?.email}
          >
            <Input disabled={!!inviteInfo?.email} />
          </Form.Item>
          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 6, message: 'Минимум 6 символов' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              Зарегистрироваться
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </Text>
      </Card>
    </div>
  );
}

export default RegisterPage;
