import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Progress } from 'antd';
import { fetchMyEfficiencyApi } from '../api/efficiency';

const { Title, Paragraph } = Typography;

export default function EfficiencyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const resp = await fetchMyEfficiencyApi();
        setData(resp);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div
        style={{
          minHeight: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin />
      </div>
    );
  }

  const { totalAssigned, completed, completedOnTime, score } = data;
  const percentCompleted = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
  const percentOnTime =
    completed > 0 ? Math.round((completedOnTime / completed) * 100) : 0;

  return (
    <div>
      <Title level={4}>Моя эффективность</Title>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Всего задач назначено" value={totalAssigned} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Выполнено задач"
              value={completed}
              suffix={`(${percentCompleted}%)`}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Выполнено в срок"
              value={completedOnTime}
              suffix={`(${percentOnTime}%)`}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Итоговый скоринг">
            <Progress type="dashboard" percent={Math.round(score)} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Как считается скоринг">
            <Paragraph>
              Скоринг учитывает долю выполненных задач и долю задач, закрытых в срок. Чем выше
              значение, тем стабильнее вы выполняете задачи.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
