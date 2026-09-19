import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  PayCircleOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Form, Modal, Progress, Select, Space, Steps, Tag, Typography, message } from "antd";
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

function formatKopecks(value) {
  return formatMoney((value || 0) / 100);
}

function formatDate(value, withTime = false) {
  if (!value) return "без срока окончания";
  return new Date(value).toLocaleString("ru-RU", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" });
}

function transitionLabel(type) {
  return {
    activate: "Подключение тарифа",
    renew: "Продление тарифа",
    upgrade: "Переход на более высокий тариф",
    downgrade: "Переход после окончания текущего тарифа"
  }[type] || "Оплата тарифа";
}

function paymentStatus(status) {
  return {
    awaiting_payment: { color: "gold", label: "Ожидает оплаты" },
    paid: { color: "green", label: "Оплачен" },
    expired: { color: "default", label: "Истёк" },
    cancelled: { color: "default", label: "Отменён" },
    failed: { color: "red", label: "Ошибка" },
    refunded: { color: "purple", label: "Возврат" }
  }[status] || { color: "default", label: status };
}

function paymentKey() {
  return globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function BillingPage() {
  const [paymentForm] = Form.useForm();
  const [data, setData] = useState({ organizations: [], plans: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const periodMonths = Form.useWatch("periodMonths", paymentForm) || 1;

  async function loadBilling() {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/organizations"));
    } catch (requestError) {
      setError(requestError.message);
      message.error(requestError.message);
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
  const openOrder = active?.activePaymentOrder;
  const scheduledPeriod = active?.subscription?.scheduledPeriod;
  function openPayment(plan) {
    setSelectedPlan(plan);
    setPaymentOrder(null);
    setPaymentIdempotencyKey(paymentKey());
    paymentForm.setFieldsValue({ periodMonths: 1 });
    setPaymentOpen(true);
  }

  function continuePayment(order) {
    const plan = data.plans.find((item) => item.key === order.targetPlan);
    setSelectedPlan(plan || { key: order.targetPlan, name: order.planName });
    setPaymentOrder(order);
    paymentForm.setFieldsValue({ periodMonths: order.periodMonths });
    setPaymentOpen(true);
  }

  function closePayment() {
    setPaymentOpen(false);
    setSelectedPlan(null);
    setPaymentOrder(null);
    setPaymentIdempotencyKey("");
    paymentForm.resetFields();
  }

  async function createPaymentOrder() {
    if (!active || !selectedPlan) return;
    let values;
    try {
      values = await paymentForm.validateFields();
    } catch {
      return;
    }

    setPaymentSaving(true);
    try {
      const result = await apiFetch(`/organizations/${active.organization._id}/payment-orders`, {
        method: "POST",
        body: JSON.stringify({
          plan: selectedPlan.key,
          periodMonths: values.periodMonths,
          idempotencyKey: paymentIdempotencyKey
        })
      });
      setPaymentOrder(result.paymentOrder);
      message.success("Тестовый платёж подготовлен");
    } catch (requestError) {
      message.error(requestError.message);
    } finally {
      setPaymentSaving(false);
    }
  }

  async function confirmPayment() {
    if (!active || !paymentOrder) return;
    setPaymentSaving(true);
    try {
      const result = await apiFetch(
        `/organizations/${active.organization._id}/payment-orders/${paymentOrder._id}/confirm`,
        { method: "POST" }
      );
      message.success(result.message || "Оплата подтверждена, тариф обновлён");
      closePayment();
      await loadBilling();
    } catch (requestError) {
      message.error(requestError.message);
    } finally {
      setPaymentSaving(false);
    }
  }

  async function cancelPayment(order = paymentOrder) {
    if (!active || !order) return;
    setPaymentSaving(true);
    try {
      await apiFetch(`/organizations/${active.organization._id}/payment-orders/${order._id}/cancel`, {
        method: "POST"
      });
      message.success("Платёж отменён");
      closePayment();
      await loadBilling();
    } catch (requestError) {
      message.error(requestError.message);
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <section className="billing-page">
      <div className="billing-page__head">
        <div>
          <Typography.Title level={1}>Тарифы и оплата</Typography.Title>
          <Typography.Paragraph>
            Выберите тариф, создайте тестовый платёж и подтвердите его — подписка обновится так же, как после банковского webhook.
          </Typography.Paragraph>
        </div>
        {data.organizations.length > 1 && (
          <Select
            className="billing-page__organization-select"
            value={active?.organization._id}
            onChange={setOrganizationId}
            options={data.organizations.map((item) => ({ label: item.organization.name, value: item.organization._id }))}
          />
        )}
      </div>

      <Alert
        className="billing-page__test-banner"
        type="warning"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message="Тестовый режим оплаты"
        description="Деньги не списываются. Кнопка «Я оплатил» имитирует подтверждённый платёж банка и запускает реальную логику подписки."
      />

      {error && <PageState type="error" description={error} onAction={loadBilling} />}

      {active && (
        <div className="billing-page__current-grid">
          <Card loading={loading} className="billing-page__current-card">
            <Space direction="vertical" size={14}>
              <div className="billing-page__current-head">
                <span className="billing-page__current-icon"><PayCircleOutlined /></span>
                <div>
                  <Typography.Text type="secondary">{active.organization.name}</Typography.Text>
                  <Typography.Title level={2}>{active.plan.name}</Typography.Title>
                </div>
              </div>
              <Space wrap>
                <Tag color="blue">{active.plan.price}</Tag>
                <Tag icon={<CalendarOutlined />}>
                  {active.organization.planExpiresAt ? `до ${formatDate(active.organization.planExpiresAt)}` : "без срока окончания"}
                </Tag>
              </Space>
              {scheduledPeriod && (
                <Alert
                  type="info"
                  showIcon
                  message={`Запланирован тариф «${data.plans.find((plan) => plan.key === scheduledPeriod.plan)?.name || scheduledPeriod.plan}»`}
                  description={`Начнёт действовать ${formatDate(scheduledPeriod.startsAt)} и завершится ${formatDate(scheduledPeriod.endsAt)}.`}
                />
              )}
              <Typography.Paragraph type="secondary">
                После окончания платного периода данные сохраняются, а новые действия подчиняются лимитам бесплатного тарифа.
              </Typography.Paragraph>
            </Space>
          </Card>

          <Card loading={loading} className="billing-page__request-card">
            <Space direction="vertical" size={12}>
              <Space align="center">
                <span className="billing-page__payment-icon"><CreditCardOutlined /></span>
                <div>
                  <Typography.Title level={3}>Оплата</Typography.Title>
                  <Typography.Text type="secondary">Провайдер: тестовый контур</Typography.Text>
                </div>
              </Space>
              {openOrder ? (
                <div className="billing-page__pending-payment">
                  <Space wrap>
                    <Tag color="gold" icon={<ClockCircleOutlined />}>Ожидает подтверждения</Tag>
                    <Tag>{openOrder.planName}</Tag>
                  </Space>
                  <Typography.Text strong>{formatKopecks(openOrder.amountKopecks)}</Typography.Text>
                  <Typography.Text type="secondary">Платёж доступен до {formatDate(openOrder.expiresAt, true)}</Typography.Text>
                  <Space wrap>
                    <Button type="primary" onClick={() => continuePayment(openOrder)}>Продолжить оплату</Button>
                    <Button danger loading={paymentSaving} onClick={() => cancelPayment(openOrder)}>Отменить</Button>
                  </Space>
                </div>
              ) : (
                <>
                  <Typography.Text>Активных платежей нет.</Typography.Text>
                  <Typography.Text type="secondary">
                    После выбора тарифа будет создан заказ с фиксированной ценой и сроком действия 30 минут.
                  </Typography.Text>
                </>
              )}
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
                <Typography.Text className="billing-page__usage-note" type="secondary">{remainingText(value, limit)}</Typography.Text>
                <Progress percent={limit ? usagePercent(value, limit) : 0} showInfo={false} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {active && (
        <Card loading={loading} title="История платежей">
          {active.paymentOrders?.length ? (
            <div className="billing-page__history">
              {active.paymentOrders.map((order) => {
                const status = paymentStatus(order.status);
                return (
                  <div className="billing-page__history-row" key={order._id}>
                    <div>
                      <Typography.Text strong>{order.planName}</Typography.Text>
                      <Typography.Text type="secondary">
                        {transitionLabel(order.transitionType)} · {order.periodMonths} мес. · {formatDate(order.createdAt, true)}
                      </Typography.Text>
                    </div>
                    <div className="billing-page__history-result">
                      <Typography.Text strong>{formatKopecks(order.amountKopecks)}</Typography.Text>
                      <Tag color={status.color}>{status.label}</Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Typography.Text type="secondary">Платежей пока нет.</Typography.Text>
          )}
        </Card>
      )}

      <div className="billing-page__plans">
        {data.plans.map((plan) => {
          const isCurrent = active?.plan.key === plan.key;
          const disabled = plan.key === "free" || Boolean(openOrder) || Boolean(scheduledPeriod);
          return (
            <Card key={plan.key} loading={loading} className={isCurrent ? "billing-page__plan billing-page__plan--active" : "billing-page__plan"}>
              <Space direction="vertical" size={12}>
                <Space>
                  <Typography.Title level={3}>{plan.name}</Typography.Title>
                  {isCurrent && <Tag color="green">Текущий</Tag>}
                </Space>
                <Typography.Title level={2}>{plan.price}</Typography.Title>
                <ul>
                  <li><CheckOutlined /> Доп. участники: {plan.limits.users}</li>
                  <li><CheckOutlined /> Активные проекты: {plan.limits.projects}</li>
                  <li><CheckOutlined /> Активные задачи: {plan.limits.activeTasks}</li>
                  <li><CheckOutlined /> Вложения: {plan.limits.attachments}</li>
                  <li><CheckOutlined /> Шаблоны: {plan.limits.templates}</li>
                  <li><CheckOutlined /> История: {plan.limits.historyDays || "без ограничений"} дней</li>
                </ul>
                <Button
                  type={plan.key === "team" ? "primary" : "default"}
                  disabled={disabled}
                  icon={<CreditCardOutlined />}
                  onClick={() => openPayment(plan)}
                >
                  {plan.key === "free"
                    ? isCurrent ? "Подключён" : "Включится после окончания"
                    : openOrder
                      ? "Сначала завершите платёж"
                      : scheduledPeriod
                        ? "Следующий период уже запланирован"
                        : isCurrent ? "Продлить" : "Оплатить"}
                </Button>
              </Space>
            </Card>
          );
        })}
      </div>

      <Modal
        title={selectedPlan ? `Оплата тарифа «${selectedPlan.name}»` : "Оплата тарифа"}
        open={paymentOpen}
        onCancel={closePayment}
        footer={paymentOrder ? [
          <Button key="cancel-payment" danger disabled={paymentSaving} onClick={() => cancelPayment()}>Отменить платёж</Button>,
          <Button key="confirm-payment" type="primary" loading={paymentSaving} onClick={confirmPayment}>Я оплатил</Button>
        ] : [
          <Button key="close" onClick={closePayment}>Отмена</Button>,
          <Button key="create" type="primary" loading={paymentSaving} onClick={createPaymentOrder}>Создать платёж</Button>
        ]}
        destroyOnHidden
      >
        <Steps
          className="billing-page__payment-steps"
          size="small"
          current={paymentOrder ? 1 : 0}
          items={[{ title: "Параметры" }, { title: "Подтверждение" }, { title: "Тариф активен" }]}
        />

        {!paymentOrder ? (
          <Form form={paymentForm} layout="vertical">
            <Form.Item name="periodMonths" label="Срок действия" rules={[{ required: true, message: "Выберите срок тарифа" }]}>
              <Select options={[
                { label: "1 месяц", value: 1 },
                { label: "3 месяца", value: 3 },
                { label: "6 месяцев", value: 6 },
                { label: "12 месяцев", value: 12 }
              ]} />
            </Form.Item>
            <div className="billing-page__request-total">
              <Typography.Text type="secondary">К оплате</Typography.Text>
              <Typography.Text strong>{formatMoney((selectedPlan?.monthlyPrice || 0) * periodMonths)}</Typography.Text>
            </div>
            <Alert
              type="info"
              showIcon
              message="Цена будет зафиксирована в заказе"
              description="Продление добавится после текущего периода. Более дешёвый тариф начнёт действовать после окончания текущего, более высокий — сразу."
            />
          </Form>
        ) : (
          <div className="billing-page__checkout">
            <div className="billing-page__mock-qr" aria-label="Тестовый платёж без банковского QR">
              <SafetyCertificateOutlined />
              <span>TEST</span>
            </div>
            <div className="billing-page__checkout-details">
              <Tag color="gold">Банк пока не подключён</Tag>
              <Typography.Title level={3}>{formatKopecks(paymentOrder.amountKopecks)}</Typography.Title>
              <Typography.Text strong>{paymentOrder.planName} · {paymentOrder.periodMonths} мес.</Typography.Text>
              <Typography.Text type="secondary">{transitionLabel(paymentOrder.transitionType)}</Typography.Text>
              <Typography.Text type="secondary">Заказ действует до {formatDate(paymentOrder.expiresAt, true)}</Typography.Text>
            </div>
            <Alert
              type="warning"
              showIcon
              message="Подтвердите тестовую оплату"
              description="Нажимая «Я оплатил», вы имитируете успешный webhook банка. Это действие действительно активирует или продлевает тариф."
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
