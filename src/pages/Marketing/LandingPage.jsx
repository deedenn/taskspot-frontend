import React from 'react';
import { Button, Typography, Row, Col, Card, Tag } from 'antd';
import './LandingPage.css';

const { Title, Paragraph, Text } = Typography;

function LandingPage({ onLoginClick, onRegisterClick }) {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-logo-block">
          <img
            src="/taskspot-logo.svg"
            alt="TaskSpot"
            className="landing-logo"
          />
        </div>
        <div className="landing-header-actions">
          <Button type="link" onClick={onLoginClick}>
            Войти
          </Button>
          <Button type="primary" onClick={onRegisterClick}>
            Регистрация
          </Button>
        </div>
      </header>

      <main className="landing-main">
        <Row gutter={[32, 32]} align="middle">
          <Col xs={24} md={12}>
            <div className="landing-hero">
              <Tag color="processing" className="landing-badge">
                Новый таск-менеджер для команд
              </Tag>
              <Title level={1} className="landing-title">
                TaskSpot — единая точка для задач по проектам
              </Title>
              <Paragraph className="landing-subtitle">
                Создавайте проекты, распределяйте задачи, контролируйте статусы
                и сроки. Удобные представления: список и Kanban-доска, роли
                инициатора, исполнителя и наблюдателя.
              </Paragraph>

              <div className="landing-cta">
                <Button
                  type="primary"
                  size="large"
                  onClick={onRegisterClick}
                >
                  Начать бесплатно
                </Button>
                <Button size="large" onClick={onLoginClick}>
                  Я уже пользуюсь
                </Button>
              </div>

              <div className="landing-info">
                <Text type="secondary">
                  • Веб-интерфейс на Ant Design<br />
                  • Роли: админ, владелец проекта, участник<br />
                  • Подтверждение выполнения задач инициатором
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="landing-cards">
              <Card className="landing-card" title="Проекты и участники">
                <Paragraph>
                  Создавайте проекты, приглашайте участников. Владелец проекта
                  и администратор управляют составом команды.
                </Paragraph>
                <Paragraph type="secondary">
                  Каждый пользователь видит только свои проекты и задачи.
                </Paragraph>
              </Card>

              <Card
                className="landing-card"
                title="Умные задачи и статусы"
              >
                <Paragraph>
                  Задачи имеют инициатора, исполнителя, наблюдателей, срок
                  выполнения, категории и статусы:
                  «Открыта → В работе → Выполнено → Закрыта».
                </Paragraph>
                <Paragraph type="secondary">
                  После выполнения исполнитель отправляет задачу на
                  подтверждение инициатору.
                </Paragraph>
              </Card>

              <Card
                className="landing-card"
                title="Доска и список"
              >
                <Paragraph>
                  Переключайтесь между Kanban-доской и табличным списком.
                  Перетаскивайте задачи между статусами drag & drop.
                </Paragraph>
                <Paragraph type="secondary">
                  Фильтруйте по категориям, исполнителю и срокам.
                </Paragraph>
              </Card>
            </div>
          </Col>
        </Row>
      </main>

      <footer className="landing-footer">
        <Text type="secondary">
          © {new Date().getFullYear()} TaskSpot. Демо-версия сервиса управления задачами.
        </Text>
      </footer>
    </div>
  );
}

export default LandingPage;
