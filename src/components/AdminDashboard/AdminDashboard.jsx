import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  FolderOpenOutlined,
  PayCircleOutlined,
  ProjectOutlined,
  RiseOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Card, Empty, Progress, Segmented, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./AdminDashboard.css";

const planLabels = {
  free: ["Бесплатный", "default"],
  team: ["Команда", "blue"],
  business: ["Бизнес", "purple"]
};

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function MetricCard({ icon, title, value, hint, tone = "blue", suffix }) {
  return (
    <Card className={`admin-dashboard__metric admin-dashboard__metric--${tone}`}>
      <div className="admin-dashboard__metric-icon">{icon}</div>
      <Statistic title={title} value={value} suffix={suffix} />
      <Typography.Text type="secondary">{hint}</Typography.Text>
    </Card>
  );
}

export function AdminDashboard({ currentUser }) {
  const [periodDays, setPeriodDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview(nextPeriod = periodDays) {
    setLoading(true);
    setError("");

    try {
      const overview = await apiFetch(`/admin/overview?periodDays=${nextPeriod}`);
      setData(overview);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  function changePeriod(value) {
    setPeriodDays(value);
    loadOverview(value);
  }

  const planRows = useMemo(
    () =>
      (data?.organizations.byPlan || []).map((item) => {
        const [label, color] = planLabels[item.plan] || [item.plan, "default"];
        return {
          ...item,
          label,
          color
        };
      }),
    [data]
  );

  const userRows = data?.recentUsers || [];

  const planColumns = [
    {
      title: "Тариф",
      dataIndex: "label",
      key: "label",
      render: (label, row) => <Tag color={row.color}>{label}</Tag>
    },
    {
      title: "Организаций",
      dataIndex: "organizations",
      key: "organizations"
    },
    {
      title: "Потенциальная MRR",
      dataIndex: "monthlyRevenue",
      key: "monthlyRevenue",
      render: formatMoney
    }
  ];

  const userColumns = [
    {
      title: "Пользователь",
      dataIndex: "name",
      key: "name",
      render: (name, user) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary">{user.email}</Typography.Text>
        </Space>
      )
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (status, user) => (
        <Space wrap size={4}>
          <Tag color={status === "inactive" ? "default" : "green"}>
            {status === "inactive" ? "Неактивен" : "Активен"}
          </Tag>
          {user.isSuperAdmin && <Tag color="gold">Admin</Tag>}
        </Space>
      )
    },
    {
      title: "Последний вход",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (date) => (date ? dayjs(date).format("DD.MM.YYYY HH:mm") : "Не входил")
    },
    {
      title: "Регистрация",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => dayjs(date).format("DD.MM.YYYY")
    }
  ];

  if (!currentUser?.isSuperAdmin) {
    return (
      <PageState
        type="error"
        title="Нет доступа"
        description="Этот раздел доступен только администратору сервиса."
      />
    );
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard__head">
        <div>
          <Typography.Title level={1}>Админ-панель</Typography.Title>
          <Typography.Paragraph>
            Операционные метрики Taskspot: пользователи, тарифы, деньги, задачи и рост продукта.
          </Typography.Paragraph>
        </div>
        <Segmented
          value={periodDays}
          onChange={changePeriod}
          options={[
            { label: "7 дней", value: 7 },
            { label: "30 дней", value: 30 },
            { label: "90 дней", value: 90 }
          ]}
        />
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={() => loadOverview(periodDays)}
        />
      )}

      <div className="admin-dashboard__metrics">
        <MetricCard
          icon={<UserOutlined />}
          title="Пользователей"
          value={data?.users.total || 0}
          hint={`${data?.users.active || 0} активных · ${data?.users.inactive || 0} неактивных`}
        />
        <MetricCard
          icon={<UserAddOutlined />}
          title="Новых пользователей"
          value={data?.users.newInPeriod || 0}
          hint={`За ${periodDays} дней · активация ${data?.users.activationRate || 0}%`}
          tone="green"
        />
        <MetricCard
          icon={<PayCircleOutlined />}
          title="Получено денег"
          value={formatMoney(data?.revenue.received || 0)}
          hint="Пока нет модели платежей, значение считается отдельно"
          tone="gold"
        />
        <MetricCard
          icon={<RiseOutlined />}
          title="Потенциальная MRR"
          value={formatMoney(data?.revenue.estimatedMonthly || 0)}
          hint={`ARR ${formatMoney(data?.revenue.estimatedAnnual || 0)} · paid ${data?.revenue.paidConversionRate || 0}%`}
          tone="purple"
        />
        <MetricCard
          icon={<FolderOpenOutlined />}
          title="Проектов"
          value={data?.projects.total || 0}
          hint={`${data?.projects.newInPeriod || 0} новых за период`}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          title="Задач"
          value={data?.tasks.total || 0}
          hint={`${data?.tasks.active || 0} активных · ${data?.tasks.closed || 0} закрытых`}
          tone="green"
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          title="На проверке"
          value={data?.tasks.review || 0}
          hint={`${data?.tasks.overdue || 0} просроченных задач`}
          tone="purple"
        />
        <MetricCard
          icon={<ProjectOutlined />}
          title="Организаций"
          value={data?.organizations.total || 0}
          hint={`${data?.organizations.paid || 0} платных организаций`}
          tone="gold"
        />
      </div>

      <div className="admin-dashboard__growth">
        <Card
          className="admin-dashboard__growth-card"
          title={
            <Space>
              <BarChartOutlined />
              Здоровье продукта
            </Space>
          }
          loading={loading}
        >
          {data ? (
            <div className="admin-dashboard__progress-grid">
              <div>
                <Typography.Text strong>Активация пользователей</Typography.Text>
                <Progress percent={data.users.activationRate} />
              </div>
              <div>
                <Typography.Text strong>Конверсия в платные организации</Typography.Text>
                <Progress percent={data.revenue.paidConversionRate} strokeColor="#722ed1" />
              </div>
              <div>
                <Typography.Text strong>Закрытие задач</Typography.Text>
                <Progress percent={data.tasks.completionRate} strokeColor="#16a34a" />
              </div>
            </div>
          ) : (
            <Empty description="Нет данных" />
          )}
        </Card>

        <Card
          className="admin-dashboard__growth-card"
          title={
            <Space>
              <CrownOutlined />
              Рост за период
            </Space>
          }
          loading={loading}
        >
          {data ? (
            <div className="admin-dashboard__growth-list">
              <span>
                <strong>{data.growth.newUsers}</strong>
                новых пользователей
              </span>
              <span>
                <strong>{data.growth.newProjects}</strong>
                новых проектов
              </span>
              <span>
                <strong>{data.growth.createdTasks}</strong>
                созданных задач
              </span>
              <span>
                <strong>{data.growth.completedTasks}</strong>
                закрытых задач
              </span>
            </div>
          ) : (
            <Empty description="Нет данных" />
          )}
        </Card>
      </div>

      <div className="admin-dashboard__tables">
        <Card title="Тарифы и деньги" loading={loading}>
          <Table
            columns={planColumns}
            dataSource={planRows}
            rowKey="plan"
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет организаций" /> }}
          />
        </Card>
        <Card title="Последние пользователи" loading={loading}>
          <Table
            columns={userColumns}
            dataSource={userRows}
            rowKey="_id"
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет пользователей" /> }}
          />
        </Card>
      </div>
    </section>
  );
}
