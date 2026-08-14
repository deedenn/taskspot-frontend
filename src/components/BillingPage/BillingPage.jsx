import { CalendarOutlined, CheckOutlined, FileDoneOutlined, PayCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Modal, Progress, Select, Space, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./BillingPage.css";

function usagePercent(value, limit) {
  if (!limit) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

function usageState(value, limit) {
  if (!limit) return "unlimited";
  if (value >= limit) return "danger";
  if (value / limit >= 0.8) return "warning";
  return "ok";
}

function remainingText(value, limit) {
  if (!limit) return "без ограничений";
  return value >= limit ? "лимит исчерпан" : `осталось ${limit - value}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function statusLabel(status) {
  const labels = {
    pending: ["На рассмотрении", "gold"],
    approved: ["Подключено", "green"],
    rejected: ["Отклонено", "red"],
    cancelled: ["Отменено", "default"]
  };

  return labels[status] || [status, "default"];
}

export function BillingPage() {
  const [requestForm] = Form.useForm();
  const [data, setData] = useState({ organizations: [], plans: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState("");
  const [requestPlan, setRequestPlan] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const requestPeriodMonths = Form.useWatch("periodMonths", requestForm) || 1;

  async function loadBilling() {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/organizations"));
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
  }, []);

  useEffect(() => {
    if (!organizationId && data.organizations.length) {
      setOrganizationId(data.organizations[0].organization._id);
    }
  }, [data.organizations, organizationId]);

  const active = data.organizations.find((item) => item.organization._id === organizationId) || data.organizations[0];
  const hasPendingRequest = active?.activeBillingRequest?.status === "pending";
  const paidPlans = data.plans.filter((plan) => plan.key !== "free");

  function openRequest(plan) {
    setRequestPlan(plan);
    requestForm.setFieldsValue({
      periodMonths: 1,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      comment: ""
    });
    setRequestOpen(true);
  }

  function closeRequest() {
    setRequestOpen(false);
    setRequestPlan(null);
    requestForm.resetFields();
  }

  async function createBillingRequest() {
    if (!active || !requestPlan) return;

    let values;
    try {
      values = await requestForm.validateFields();
    } catch {
      return;
    }

    setRequestSaving(true);
    try {
      await apiFetch(`/organizations/${active.organization._id}/billing-requests`, {
        method: "POST",
        body: JSON.stringify({
          plan: requestPlan.key,
          periodMonths: values.periodMonths,
          contactName: values.contactName || "",
          contactEmail: values.contactEmail || "",
          contactPhone: values.contactPhone || "",
          comment: values.comment || ""
        })
      });

      message.success("Заявка на тариф отправлена");
      closeRequest();
      await loadBilling();
    } catch (error) {
      message.error(error.message);
    } finally {
      setRequestSaving(false);
    }
  }

  return (
    <section className="billing-page">
      <div className="billing-page__head">
        <div>
          <Typography.Title level={1}>Тарифы и лимиты</Typography.Title>
          <Typography.Paragraph>
            Бесплатный старт, заявка на платный тариф и ручное включение администратором сервиса.
          </Typography.Paragraph>
        </div>
        {data.organizations.length > 1 && (
          <Select
            className="billing-page__organization-select"
            value={active?.organization._id}
            onChange={setOrganizationId}
            options={data.organizations.map((item) => ({
              label: item.organization.name,
              value: item.organization._id
            }))}
          />
        )}
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadBilling}
        />
      )}

      {active && (
        <div className="billing-page__current-grid">
          <Card loading={loading} className="billing-page__current-card">
            <Space direction="vertical" size={14}>
              <div className="billing-page__current-head">
                <span className="billing-page__current-icon">
                  <PayCircleOutlined />
                </span>
                <div>
                  <Typography.Text type="secondary">{active.organization.name}</Typography.Text>
                  <Typography.Title level={2}>{active.plan.name}</Typography.Title>
                </div>
              </div>
              <Space wrap>
                <Tag color="blue">{active.plan.price}</Tag>
                <Tag icon={<CalendarOutlined />}>
                  {active.organization.planExpiresAt
                    ? `до ${new Date(active.organization.planExpiresAt).toLocaleDateString("ru-RU")}`
                    : "без срока окончания"}
                </Tag>
              </Space>
              <Typography.Paragraph type="secondary">
                Лимиты считаются по компании. Если компания на платном тарифе, участники могут работать в ее проектах
                по лимитам этой компании.
              </Typography.Paragraph>
            </Space>
          </Card>

          <Card loading={loading} className="billing-page__request-card">
            <Space direction="vertical" size={12}>
              <Typography.Title level={3}>Заявка на тариф</Typography.Title>
              {active.activeBillingRequest ? (
                <>
                  <Space wrap>
                    <Tag color={statusLabel(active.activeBillingRequest.status)[1]}>
                      {statusLabel(active.activeBillingRequest.status)[0]}
                    </Tag>
                    <Tag>{active.activeBillingRequest.periodMonths} мес.</Tag>
                    <Tag>{formatMoney(active.activeBillingRequest.amount)}</Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    Тариф: {data.plans.find((plan) => plan.key === active.activeBillingRequest.plan)?.name || active.activeBillingRequest.plan}
                  </Typography.Text>
                  {active.activeBillingRequest.adminNote && (
                    <Alert type="info" showIcon message={active.activeBillingRequest.adminNote} />
                  )}
                </>
              ) : (
                <Typography.Text type="secondary">
                  Заявок пока нет. Выберите тариф ниже, и администратор вручную включит его после оплаты или согласования.
                </Typography.Text>
              )}
              <Alert
                type="info"
                showIcon
                message="Подготовлено к СБП"
                description={data.billing?.note || "Позже сюда подключим оплату через DigitalKassa и банк Точка."}
              />
            </Space>
          </Card>
        </div>
      )}

      {active && (
        <Card loading={loading} title="Использование лимитов">
          <div className="billing-page__usage">
            {[
              ["Дополнительные участники", active.usage.users, active.limits.users],
              ["Активные проекты", active.usage.projects, active.limits.projects],
              ["Активные задачи", active.usage.activeTasks, active.limits.activeTasks],
              ["Шаблоны", active.usage.templates, active.limits.templates],
              ["Повторяющиеся задачи", active.usage.recurringTasks, active.limits.recurringTasks],
              ["Вложения", active.usage.attachments, active.limits.attachments]
            ].map(([label, value, limit]) => (
              <div className={`billing-page__usage-item billing-page__usage-item--${usageState(value, limit)}`} key={label}>
                <Space className="billing-page__usage-row">
                  <Typography.Text>{label}</Typography.Text>
                  <Typography.Text type="secondary">{value} / {limit || "∞"}</Typography.Text>
                </Space>
                <Typography.Text className="billing-page__usage-note" type="secondary">
                  {remainingText(value, limit)}
                </Typography.Text>
                <Progress percent={limit ? usagePercent(value, limit) : 0} showInfo={false} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="billing-page__plans">
        {data.plans.map((plan) => (
          <Card key={plan.key} loading={loading} className={active?.plan.key === plan.key ? "billing-page__plan billing-page__plan--active" : "billing-page__plan"}>
            <Space direction="vertical" size={12}>
              <Space>
                <Typography.Title level={3}>{plan.name}</Typography.Title>
                {active?.plan.key === plan.key && <Tag color="green">Текущий</Tag>}
              </Space>
              <Typography.Title level={2}>{plan.price}</Typography.Title>
              <ul>
                <li><CheckOutlined /> Доп. участники: {plan.limits.users}</li>
                <li><CheckOutlined /> Активные проекты: {plan.limits.projects}</li>
                <li><CheckOutlined /> Активные задачи: {plan.limits.activeTasks}</li>
                <li><CheckOutlined /> Шаблоны: {plan.limits.templates}</li>
                <li><CheckOutlined /> История: {plan.limits.historyDays || "без ограничений"} дней</li>
              </ul>
              <Button
                type={active?.plan.key === plan.key ? "default" : "primary"}
                disabled={active?.plan.key === plan.key || plan.key === "free" || hasPendingRequest}
                icon={active?.plan.key === plan.key ? <CheckOutlined /> : <FileDoneOutlined />}
                onClick={() => openRequest(plan)}
              >
                {active?.plan.key === plan.key
                  ? "Подключён"
                  : hasPendingRequest
                    ? "Заявка уже отправлена"
                    : "Оставить заявку"}
              </Button>
              {plan.key !== "free" && active?.plan.key !== plan.key && (
                <Alert
                  type="info"
                  showIcon
                  message="Сейчас включается вручную"
                  description="После заявки администратор сервиса проверит оплату и задаст срок действия тарифа."
                />
              )}
            </Space>
          </Card>
        ))}
      </div>

      <Modal
        title={requestPlan ? `Заявка на тариф «${requestPlan.name}»` : "Заявка на тариф"}
        open={requestOpen}
        onCancel={closeRequest}
        onOk={createBillingRequest}
        confirmLoading={requestSaving}
        okText="Отправить заявку"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={requestForm} layout="vertical">
          <Form.Item
            name="periodMonths"
            label="Срок действия"
            rules={[{ required: true, message: "Выберите срок тарифа" }]}
          >
            <Select
              options={[
                { label: "1 месяц", value: 1 },
                { label: "3 месяца", value: 3 },
                { label: "6 месяцев", value: 6 },
                { label: "12 месяцев", value: 12 }
              ]}
            />
          </Form.Item>
          <div className="billing-page__request-total">
            <Typography.Text type="secondary">Сумма к оплате</Typography.Text>
            <Typography.Text strong>
              {formatMoney((requestPlan?.monthlyPrice || 0) * requestPeriodMonths)}
            </Typography.Text>
          </div>
          <Form.Item name="contactName" label="Контактное лицо">
            <Input placeholder="Кто отвечает за оплату" />
          </Form.Item>
          <Form.Item name="contactEmail" label="Email для счёта">
            <Input placeholder="billing@company.ru" />
          </Form.Item>
          <Form.Item name="contactPhone" label="Телефон">
            <Input placeholder="+7..." />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={3} maxLength={300} showCount placeholder="Например: нужна оплата по СБП и закрывающие документы" />
          </Form.Item>
          <Alert
            type="warning"
            showIcon
            message="Оплата пока не списывается автоматически"
            description="Заявка создаст запись для администратора. Позже этот шаг будет заменён оплатой через СБП DigitalKassa/Точка."
          />
        </Form>
      </Modal>
    </section>
  );
}
