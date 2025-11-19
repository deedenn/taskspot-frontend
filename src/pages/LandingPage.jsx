import React, { useEffect, useState } from 'react';
import { Button, Col, Row, Typography, Card, Space, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import { trackLandingVisit, trackLandingRegisterClick, fetchLandingMetrics } from '../api/metrics';
import Logo from '../components/Logo';

const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    trackLandingVisit();
    fetchLandingMetrics()
      .then(setMetrics)
      .catch(() => {});
  }, []);

  const handleRegisterClick = () => {
    trackLandingRegisterClick();
    navigate('/register');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #001529 0, #000 60%, #000 100%)',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '16px 16px 40px',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 32,
          }}
        >
          <Logo />
          <Space>
            <Button onClick={() => navigate('/login')}>Войти</Button>
            <Button type="primary" onClick={handleRegisterClick}>
              Регистрация
            </Button>
          </Space>
        </header>

        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={14}>
            <Title level={1} style={{ color: '#fff', marginBottom: 12 }}>
              Управляй задачами команды в одном месте
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 24 }}>
              TaskSpot помогает ставить задачи, контролировать сроки, видеть статус выполнения и
              эффективность каждого участника проекта.
            </Paragraph>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Button type="primary" size="large" onClick={handleRegisterClick}>
                Начать бесплатно
              </Button>
              <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                Создайте проект, пригласите команду по email и сразу приступайте к работе.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Card
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Title level={4} style={{ color: '#fff' }}>
                Что умеет TaskSpot
              </Title>
              <ul style={{ paddingLeft: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
                <li>Проекты с участниками и ролями</li>
                <li>Задачи с категориями, исполнителями и наблюдателями</li>
                <li>Канбан-доска и список задач с фильтрами</li>
                <li>Панель эффективности и админ-статистика</li>
              </ul>
              {metrics && (
                <Space size={16} wrap>
                  <Statistic
                    title="Посещений лендинга"
                    value={metrics.visits}
                    valueStyle={{ color: '#fff' }}
                  />
                  <Statistic
                    title="Кликов по регистрации"
                    value={metrics.registerClicks}
                    suffix={
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                        ({metrics.conversion}%)
                      </span>
                    }
                    valueStyle={{ color: '#36cfc9' }}
                  />
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
