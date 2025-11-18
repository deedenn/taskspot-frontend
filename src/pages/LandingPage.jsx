import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Layout, Typography, Row, Col, Card, Space } from 'antd';
import { CheckCircleOutlined, RocketOutlined, TeamOutlined } from '@ant-design/icons';
import { landingVisitApi, landingRegisterClickApi } from '../api/metrics';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    landingVisitApi().catch(() => {});
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    landingRegisterClickApi().catch(() => {});
    navigate('/register');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#0b1221' }}>
      <Header
        style={{
          background: '#0b1221',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background:
                'radial-gradient(circle at 30% 30%, #40a9ff, #722ed1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: 18,
            }}
          >
            TS
          </div>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            TaskSpot
          </Text>
        </div>
        <Space>
          <Button type="text" style={{ color: '#fff' }} onClick={handleLogin}>
            Войти
          </Button>
          <Button type="primary" onClick={handleRegister}>
            Регистрация
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '48px 24px' }}>
        <Row gutter={[32, 32]} align="middle" justify="center">
          <Col xs={24} md={12}>
            <Title style={{ color: '#fff' }}>
              Управляй задачами команды в одном месте
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>
              TaskSpot помогает организовать проекты, контролировать сроки,
              видеть нагрузку по пользователям и оценивать эффективность работы.
            </Paragraph>
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" size="large" onClick={handleRegister}>
                Начать бесплатно
              </Button>
              <Button size="large" onClick={handleLogin}>
                Уже есть аккаунт
              </Button>
            </Space>
            <Paragraph style={{ color: 'rgba(255,255,255,0.45)', marginTop: 16 }}>
              Неограниченное количество проектов и задач. Админ-панель, приглашения по email,
              доска задач, лист задач, эффективность исполнителей.
            </Paragraph>
          </Col>
          <Col xs={24} md={10}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(64,169,255,0.15), rgba(114,46,209,0.2))',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Space direction="vertical" size={8}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong style={{ color: '#fff' }}>
                        Прозрачные задачи
                      </Text>
                    </Space>
                    <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Статусы задач, категории, исполнитель и наблюдатели. Полный контекст по
                      каждой задаче в одном месте.
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Space direction="vertical" size={8}>
                    <Space>
                      <TeamOutlined style={{ color: '#1677ff' }} />
                      <Text strong>Управление проектами</Text>
                    </Space>
                    <Text type="secondary">
                      Приглашения по email, роли в проекте и гибкая видимость задач.
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Space direction="vertical" size={8}>
                    <Space>
                      <RocketOutlined style={{ color: '#fa8c16' }} />
                      <Text strong>Эффективность</Text>
                    </Space>
                    <Text type="secondary">
                      Понятный скоринг по задачам и срокам исполнения для каждого пользователя.
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#0b1221', color: 'rgba(255,255,255,0.45)' }}>
        TaskSpot © {new Date().getFullYear()} · api.taskspot.ru
      </Footer>
    </Layout>
  );
}

export default LandingPage;
