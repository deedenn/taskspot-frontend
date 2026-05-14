import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined } from "@ant-design/icons";
import { Card, Empty, List, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./ControlPage.css";

const statusLabels = {
  open: ["Открыта", "blue"],
  in_progress: ["В работе", "gold"],
  review: ["Проверка", "purple"],
  done: ["Проверка", "purple"],
  closed: ["Закрыта", "default"]
};

function TaskList({ tasks, empty }) {
  if (!tasks?.length) return <Empty description={empty} />;

  return (
    <List
      dataSource={tasks}
      renderItem={(task) => {
        const [label, color] = statusLabels[task.status] || [task.status, "default"];
        return (
          <List.Item>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Link to={`/app/tasks/${task._id}`}>{task.description}</Link>
                  <Tag color={color}>{label}</Tag>
                </Space>
              }
              description={`${task.project?.name || "Проект"} · срок ${dayjs(task.dueDate).format("DD.MM.YYYY")} · ${task.assignee?.name || task.assigneeEmail || "без ответственного"}`}
            />
          </List.Item>
        );
      }}
    />
  );
}

export function ControlPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/reports/control"));
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const summary = data?.summary || {};

  return (
    <section className="control-page">
      <div className="control-page__head">
        <div>
          <Typography.Title level={1}>Контроль</Typography.Title>
          <Typography.Paragraph>
            Управленческий обзор: просрочки, проверка, нагрузка и закрытые задачи.
          </Typography.Paragraph>
        </div>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadReport}
        />
      )}

      <div className="control-page__stats">
        <Card loading={loading}><Statistic title="Активные" value={summary.active || 0} prefix={<TeamOutlined />} /></Card>
        <Card loading={loading}><Statistic title="Просрочены" value={summary.overdue || 0} prefix={<AlertOutlined />} valueStyle={{ color: "#cf1322" }} /></Card>
        <Card loading={loading}><Statistic title="На проверке" value={summary.waitingReview || 0} prefix={<ClockCircleOutlined />} /></Card>
        <Card loading={loading}><Statistic title="Закрыто за месяц" value={summary.closedThisMonth || 0} prefix={<CheckCircleOutlined />} /></Card>
      </div>

      <div className="control-page__grid">
        <Card title="Просроченные задачи" loading={loading}>
          <TaskList tasks={data?.overdue} empty="Просроченных задач нет" />
        </Card>
        <Card title="Ждут проверки" loading={loading}>
          <TaskList tasks={data?.waitingReview} empty="Задач на проверке нет" />
        </Card>
      </div>

      <div className="control-page__grid">
        <Card title="Нагрузка по ответственным" loading={loading}>
          <Table
            rowKey="key"
            size="small"
            scroll={{ x: 620 }}
            pagination={false}
            dataSource={data?.byAssignee || []}
            columns={[
              { title: "Ответственный", dataIndex: "name" },
              { title: "Активные", dataIndex: "active" },
              { title: "Просрочены", dataIndex: "overdue" },
              { title: "На проверке", dataIndex: "review" },
              { title: "Закрыты", dataIndex: "closed" }
            ]}
          />
        </Card>
        <Card title="Проекты" loading={loading}>
          <Table
            rowKey="key"
            size="small"
            scroll={{ x: 620 }}
            pagination={false}
            dataSource={data?.byProject || []}
            columns={[
              { title: "Проект", dataIndex: "name" },
              { title: "Активные", dataIndex: "active" },
              { title: "Просрочены", dataIndex: "overdue" },
              { title: "На проверке", dataIndex: "review" },
              { title: "Закрыты", dataIndex: "closed" }
            ]}
          />
        </Card>
      </div>
    </section>
  );
}
