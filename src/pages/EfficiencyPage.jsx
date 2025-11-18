import React, { useEffect, useState } from 'react';
import { Card, Typography, Statistic, Row, Col, Progress, Spin, Alert } from 'antd';
import { fetchMyEfficiencyApi } from '../api/efficiency';

const { Title, Text } = Typography;

function EfficiencyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMyEfficiencyApi();
        setData(res);
      } catch (e) {
        setError(e.message || 'Не удалось загрузить эффективность');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" message={error} />
    );
  }

  if (!data) return null;

  return (
    <Card title="Эффективность">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Statistic
            title="Общий скоринг"
            value={data.score}
            suffix="/ 100"
          />
          <Text type="secondary">{data.level}</Text>
          <div style={{ marginTop: 16 }}>
            <Progress percent={data.score} />
          </div>
        </Col>
        <Col xs={24} md={16}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Statistic
                title="Назначено задач"
                value={data.tasksAssigned}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Выполнено"
                value={data.tasksCompleted}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="В срок"
                value={data.tasksCompletedOnTime}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Просрочено (открыто)"
                value={data.tasksOverdueOpen}
              />
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} md={8}>
              <Statistic
                title="Доля выполненных"
                value={Math.round((data.completionRate || 0) * 100)}
                suffix="%"
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Доля в срок"
                value={Math.round((data.onTimeRate || 0) * 100)}
                suffix="%"
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Доля просроченных"
                value={Math.round((data.overdueRate || 0) * 100)}
                suffix="%"
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
}

export default EfficiencyPage;
