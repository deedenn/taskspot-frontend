import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  FolderOpenOutlined,
  PayCircleOutlined,
  ProjectOutlined,
  StopOutlined,
  RiseOutlined,
  UnlockOutlined,
  UserAddOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Progress, Segmented, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api.js";
import { fullName } from "../../utils/users.js";
import { PageState } from "../PageState/PageState.jsx";
import "./AdminDashboard.css";

const planLabels = {
  free: ["Бесплатный", "default"],
  team: ["Команда", "blue"],
  business: ["Бизнес", "purple"]
};

const statusLabels = {
  active: ["Активен", "green"],
  inactive: ["Неактивен", "default"],
  blocked: ["Заблокирован", "red"]
};

function planLabel(plan) {
  return planLabels[plan] || [plan, "default"];
}

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
  const [planForm] = Form.useForm();
  const [periodDays, setPeriodDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("all");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [planUser, setPlanUser] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);

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

  async function loadUsers({
    page = usersPagination.page,
    limit = usersPagination.limit,
    search = userSearch,
    status = userStatus
  } = {}) {
    setUsersLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status !== "all") {
        params.set("status", status);
      }

      const result = await apiFetch(`/admin/users?${params.toString()}`);
      setUsers(result.users);
      setUsersPagination(result.pagination);
    } catch (error) {
      message.error(error.message);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
    loadUsers({ page: 1 });
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

  function primaryPlan(user) {
    return user?.plans?.find((item) => item.role === "owner") || user?.plans?.[0];
  }

  function openPlanModal(user) {
    const currentPlan = primaryPlan(user);
    setPlanUser(user);
    planForm.setFieldsValue({
      organizationId: currentPlan?.organizationId,
      plan: currentPlan?.plan || "free",
      expiresAt: currentPlan?.planExpiresAt ? dayjs(currentPlan.planExpiresAt) : null,
      note: currentPlan?.planChangeReason || ""
    });
    setPlanModalOpen(true);
  }

  function closePlanModal() {
    setPlanModalOpen(false);
    setPlanUser(null);
    planForm.resetFields();
  }

  const planColumns = [
    {
      title: "Тариф",
      dataIndex: "label",
      key: "label",
      render: (label, row) => <Tag color={row.color}>{label}</Tag>
    },
    {
      title: "Компаний",
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
          <Typography.Text strong>{fullName(user, name)}</Typography.Text>
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
          <Tag color={(statusLabels[status] || statusLabels.active)[1]}>
            {(statusLabels[status] || statusLabels.active)[0]}
          </Tag>
          {user.isSuperAdmin && <Tag color="gold">Admin</Tag>}
        </Space>
      )
    },
    {
      title: "Тариф",
      dataIndex: "plans",
      key: "plans",
      render: (plans = []) => {
        if (!plans.length) {
          return <Typography.Text type="secondary">Нет компаний</Typography.Text>;
        }

        return (
          <div className="admin-dashboard__plan-list">
            {plans.slice(0, 2).map((item) => {
              const [label, color] = planLabel(item.plan);
              const expiresAt = item.planExpiresAt ? dayjs(item.planExpiresAt).format("DD.MM.YYYY") : "без срока";
              return (
                <div key={`${item.organizationId}-${item.plan}`} className="admin-dashboard__plan-row">
                  <Tag color={color}>{label}</Tag>
                  <span>
                    {item.organization} · {expiresAt}
                  </span>
                </div>
              );
            })}
            {plans.length > 2 && <Tag>+{plans.length - 2}</Tag>}
          </div>
        );
      }
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
    },
    {
      title: "",
      key: "action",
      fixed: "right",
      render: (_, user) => {
        if (user.isSuperAdmin || user._id === currentUser?._id) {
          return null;
        }

        const isBlocked = user.status === "blocked";
        const nextStatus = isBlocked ? "active" : "blocked";

        return (
          <Space wrap>
            <Button
              icon={<PayCircleOutlined />}
              disabled={!user.plans?.length}
              onClick={() => openPlanModal(user)}
            >
              Тариф
            </Button>
            <Popconfirm
              title={isBlocked ? "Разблокировать пользователя?" : "Заблокировать пользователя?"}
              description={
                isBlocked
                  ? "Пользователь снова сможет войти и работать в сервисе."
                  : "Пользователь сразу потеряет доступ, включая уже активные сессии."
              }
              okText={isBlocked ? "Разблокировать" : "Заблокировать"}
              cancelText="Отмена"
              onConfirm={() => updateUserStatus(user, nextStatus)}
            >
              <Button
                danger={!isBlocked}
                icon={isBlocked ? <UnlockOutlined /> : <StopOutlined />}
                loading={updatingUserId === user._id}
              >
                {isBlocked ? "Разблокировать" : "Блокировать"}
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  async function updateUserStatus(user, status) {
    setUpdatingUserId(user._id);

    try {
      const result = await apiFetch(`/admin/users/${user._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setUsers((items) => items.map((item) => (item._id === user._id ? result.user : item)));
      message.success(status === "blocked" ? "Пользователь заблокирован" : "Пользователь разблокирован");
      loadOverview(periodDays);
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdatingUserId("");
    }
  }

  async function updateUserPlan() {
    if (!planUser) return;

    let values;
    try {
      values = await planForm.validateFields();
    } catch {
      return;
    }

    setPlanSaving(true);

    try {
      const result = await apiFetch(`/admin/users/${planUser._id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({
          organizationId: values.organizationId,
          plan: values.plan,
          expiresAt: values.expiresAt ? values.expiresAt.toISOString() : "",
          note: values.note || ""
        })
      });

      setUsers((items) => items.map((item) => (item._id === planUser._id ? result.user : item)));
      message.success("Тариф пользователя обновлен");
      closePlanModal();
      loadOverview(periodDays);
    } catch (error) {
      message.error(error.message);
    } finally {
      setPlanSaving(false);
    }
  }

  function applyUserFilters() {
    loadUsers({ page: 1, search: userSearch, status: userStatus });
  }

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
          title="Компаний"
          value={data?.organizations.total || 0}
          hint={`${data?.organizations.paid || 0} платных компаний · ${data?.organizations.manualPlans || 0} ручных тарифов`}
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
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет компаний" /> }}
          />
        </Card>
        <Card title="Пользователи сервиса">
          <div className="admin-dashboard__user-tools">
            <Input.Search
              allowClear
              value={userSearch}
              placeholder="Поиск по имени или email"
              onChange={(event) => setUserSearch(event.target.value)}
              onSearch={(_, _event, info) => {
                if (info?.source !== "clear") {
                  applyUserFilters();
                } else {
                  loadUsers({ page: 1, search: "", status: userStatus });
                }
              }}
            />
            <Select
              value={userStatus}
              options={[
                { label: "Все статусы", value: "all" },
                { label: "Активные", value: "active" },
                { label: "Неактивные", value: "inactive" },
                { label: "Заблокированные", value: "blocked" }
              ]}
              onChange={(value) => {
                setUserStatus(value);
                loadUsers({ page: 1, status: value });
              }}
            />
            <Button onClick={applyUserFilters}>Показать</Button>
          </div>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="_id"
            loading={usersLoading}
            pagination={{
              current: usersPagination.page,
              pageSize: usersPagination.limit,
              total: usersPagination.total,
              showSizeChanger: false
            }}
            onChange={(pagination) => {
              loadUsers({ page: pagination.current, limit: pagination.pageSize });
            }}
            scroll={{ x: 980 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет пользователей" /> }}
          />
        </Card>
      </div>

      <Modal
        title="Изменить тариф пользователя"
        open={planModalOpen}
        onCancel={closePlanModal}
        onOk={updateUserPlan}
        confirmLoading={planSaving}
        okText="Сохранить тариф"
        cancelText="Отмена"
        destroyOnHidden
      >
        {planUser && (
          <div className="admin-dashboard__plan-modal">
            <div className="admin-dashboard__plan-user">
              <Typography.Text strong>{fullName(planUser)}</Typography.Text>
              <Typography.Text type="secondary">{planUser.email}</Typography.Text>
            </div>
            <Form form={planForm} layout="vertical">
              <Form.Item
                name="organizationId"
                label="Компания"
                rules={[{ required: true, message: "Выберите компанию" }]}
              >
                <Select
                  placeholder="Выберите компанию"
                  options={(planUser.plans || []).map((item) => ({
                    label: `${item.organization} · ${planLabel(item.plan)[0]}`,
                    value: item.organizationId
                  }))}
                  onChange={(organizationId) => {
                    const selectedPlan = planUser.plans.find((item) => item.organizationId === organizationId);
                    planForm.setFieldsValue({
                      plan: selectedPlan?.plan || "free",
                      expiresAt: selectedPlan?.planExpiresAt ? dayjs(selectedPlan.planExpiresAt) : null,
                      note: selectedPlan?.planChangeReason || ""
                    });
                  }}
                />
              </Form.Item>
              <Form.Item
                name="plan"
                label="Тариф"
                rules={[{ required: true, message: "Выберите тариф" }]}
              >
                <Select
                  options={Object.entries(planLabels).map(([value, [label]]) => ({
                    label,
                    value
                  }))}
                />
              </Form.Item>
              <Form.Item name="expiresAt" label="Действует до">
                <DatePicker className="admin-dashboard__full-width" format="DD.MM.YYYY" allowClear />
              </Form.Item>
              <Form.Item name="note" label="Комментарий администратора">
                <Input.TextArea
                  rows={3}
                  maxLength={240}
                  showCount
                  placeholder="Например: тестовый доступ на 30 дней или ручная оплата по счету"
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </section>
  );
}
