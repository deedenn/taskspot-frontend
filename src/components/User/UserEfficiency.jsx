import React from 'react';
import { Card, Row, Col, Statistic, Progress, Typography } from 'antd';
import './UserEfficiency.css';

const { Title, Paragraph, Text } = Typography;

function UserEfficiency({ metrics }) {
  if (!metrics) {
    return null;
  }

  const {
    totalAssigned,
    completed,
    onTime,
    overdueOpen,
    score,
    level,
    status,
  } = metrics;

  return (
    <div className="user-efficiency-root">
      <Card className="user-efficiency-main-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={10}>
            <Title level={4} style={{ marginBottom: 16 }}>
              Эффективность по задачам
            </Title>
            {score !== null ? (
              <Progress
                type="dashboard"
                percent={score}
                status={status}
              />
            ) : (
              <Text type="secondary">
                Пока недостаточно данных, чтобы посчитать эффективность.
                Нужны задачи, назначенные на вас.
              </Text>
            )}
            {score !== null && (
              <Paragraph style={{ marginTop: 16 }}>
                <Text strong>{level}</Text>
              </Paragraph>
            )}
          </Col>
          <Col xs={24} md={14}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Задач назначено вам"
                  value={totalAssigned}
                />
              </Col>
              <Col span={12}>
                <Statistic title="Задач выполнено" value={completed} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Выполнено в срок"
                  value={onTime}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Просроченных сейчас"
                  value={overdueOpen}
                  valueStyle={
                    overdueOpen > 0 ? { color: '#cf1322' } : undefined
                  }
                />
              </Col>
            </Row>
            <Paragraph style={{ marginTop: 16 }}>
              <Text type="secondary">
                Скоринг рассчитывается по формуле:{' '}
                <Text code>
                  60% выполнение всех задач + 40% выполнение в срок − 20%
                  за открытые просроченные задачи
                </Text>
                . Итоговый балл показан на шкале от 0 до 100.
              </Text>
            </Paragraph>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default UserEfficiency;
