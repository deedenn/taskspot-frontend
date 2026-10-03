import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  PayCircleOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, Form, Modal, Progress, Select, Space, Steps, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
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
    partially_refunded: { color: "orange", label: "Частичный возврат" },
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

  const loadBilling = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/organizations"));
    } catch (requestError) {
      setError(requestError.message);
      message.error(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    if (!organizationId && data.organizations.length) {
      setOrganizationId(data.organizations[0].organization._id);
    }
  }, [data.organizations, organizationId]);

  const active = data.organizations.find((item) => item.organization._id === organizationId) || data.organizations[0];
  const openOrder = active?.activePaymentOrder;
  const canManageBilling = active?.canManageBilling !== false;
  const scheduledPeriod = active?.subscription?.scheduledPeriod;
  const testMode = data.billing?.testMode ?? true;
  const billingReady = data.billing?.ready ?? true;
  const activeProviderName = data.billing?.activeProvider?.name || "Тестовая оплата";
  const activeOrganizationId = active?.organization._id;
  const isImmediateUpgrade = active?.plan.key === "team" && selectedPlan?.key === "business";
  const paymentTerminal = paymentOrder && ["expired", "cancelled", "failed", "refunded"].includes(paymentOrder.status);
  function openPayment(plan) {
    setSelectedPlan(plan);
    setPaymentOrder(null);
    setPaymentIdempotencyKey(paymentKey());
    paymentForm.setFieldsValue({ periodMonths: 1, acceptImmediateUpgradeNoCredit: false });
    setPaymentOpen(true);
  }

  function continuePayment(order) {
    const plan = data.plans.find((item) => item.key === order.targetPlan);
    setSelectedPlan(plan || { key: order.targetPlan, name: order.planName });
    setPaymentOrder(order);
    paymentForm.setFieldsValue({ periodMonths: order.periodMonths });
    setPaymentOpen(true);
  }

  const closePayment = useCallback(() => {
    setPaymentOpen(false);
    setSelectedPlan(null);
    setPaymentOrder(null);
    setPaymentIdempotencyKey("");
    paymentForm.resetFields();
  }, [paymentForm]);

  useEffect(() => {
    if (!paymentOpen || !paymentOrder?._id || paymentOrder.payment?.provider === "mock" || !activeOrganizationId) {
      return undefined;
    }
    if (["paid", "expired", "cancelled", "failed", "refunded"].includes(paymentOrder.status)) return undefined;

    let stopped = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await apiFetch(`/organizations/${activeOrganizationId}/payment-orders/${paymentOrder._id}`);
        if (stopped) return;
        setPaymentOrder(result.paymentOrder);
        if (result.paymentOrder.status === "paid") {
          message.success("Оплата подтверждена банком, тариф обновлён");
          closePayment();
          await loadBilling({ silent: true });
        }
      } catch (requestError) {
        if (!stopped) console.error("Payment status refresh failed", requestError);
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(refresh, 3000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeOrganizationId, closePayment, loadBilling, paymentOpen, paymentOrder?._id, paymentOrder?.payment?.provider, paymentOrder?.status]);

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
          idempotencyKey: paymentIdempotencyKey,
          acceptImmediateUpgradeNoCredit: values.acceptImmediateUpgradeNoCredit === true
        })
      });
      setPaymentOrder(result.paymentOrder);
      if (result.paymentOrder.payment?.status === "creation_unknown") message.warning(result.message);
      else message.success(result.message || (result.testMode ? "Тестовый платёж подготовлен" : "QR-код для оплаты создан"));
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
            Выберите тариф и срок. После оплаты через СБП подписка обновится автоматически.
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

      {testMode ? (
        <Alert
          className="billing-page__test-banner"
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          message="Тестовый режим оплаты"
          description="Деньги не списываются. Кнопка «Я оплатил» имитирует подтверждённый платёж банка и запускает реальную логику подписки."
        />
      ) : (
        <Alert
          type={billingReady ? "success" : "error"}
          showIcon
          message={billingReady ? "Безопасная оплата через СБП" : "Оплата временно недоступна"}
          description={data.billing?.note}
        />
      )}

      {error && <PageState type="error" description={error} onAction={loadBilling} />}

      {active && !canManageBilling && (
        <Alert
          type="info"
          showIcon
          message="Просмотр тарифа"
          description="Оплачивать тариф и просматривать историю платежей могут только владелец и администраторы компании."
        />
      )}

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

          {canManageBilling && <Card loading={loading} className="billing-page__request-card">
            <Space direction="vertical" size={12}>
              <Space align="center">
                <span className="billing-page__payment-icon"><CreditCardOutlined /></span>
                <div>
                  <Typography.Title level={3}>Оплата</Typography.Title>
                  <Typography.Text type="secondary">Провайдер: {activeProviderName}</Typography.Text>
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
                    {openOrder.payment?.provider === "mock" && (
                      <Button danger loading={paymentSaving} onClick={() => cancelPayment(openOrder)}>Отменить</Button>
                    )}
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
          </Card>}
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

      {active && canManageBilling && (
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
                      {order.fiscalization?.receiptUrl && (
                        <Typography.Link href={order.fiscalization.receiptUrl} target="_blank" rel="noreferrer">
                          Кассовый чек
                        </Typography.Link>
                      )}
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
          const disabled = !canManageBilling || plan.key === "free" || Boolean(openOrder) || Boolean(scheduledPeriod);
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
                  disabled={disabled || !billingReady}
                  icon={<CreditCardOutlined />}
                  onClick={() => openPayment(plan)}
                >
                  {plan.key === "free"
                    ? isCurrent ? "Подключён" : "Включится после окончания"
                    : !canManageBilling
                      ? "Только для администратора"
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
        footer={paymentOrder ? testMode ? [
          <Button key="cancel-payment" danger disabled={paymentSaving} onClick={() => cancelPayment()}>Отменить платёж</Button>,
          <Button key="confirm-payment" type="primary" loading={paymentSaving} onClick={confirmPayment}>Я оплатил</Button>
        ] : [
          <Button key="close-payment" onClick={closePayment}>Закрыть</Button>,
          paymentOrder.payment?.paymentUrl && !paymentTerminal ? (
            <Button key="open-bank" type="primary" href={paymentOrder.payment.paymentUrl} target="_blank" rel="noreferrer">
              Открыть приложение банка
            </Button>
          ) : null
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
            {isImmediateUpgrade && (
              <Alert
                type="warning"
                showIcon
                message="Переход на «Бизнес» произойдёт сразу"
                description="Неиспользованный остаток оплаченного периода тарифа «Команда» не переносится, не засчитывается в стоимость нового тарифа и не компенсируется. Новый оплаченный период «Бизнес» начнётся после подтверждения платежа."
              />
            )}
            <Form.Item name="periodMonths" label="Срок действия" rules={[{ required: true, message: "Выберите срок тарифа" }]}>
              <Select options={[
                { label: "1 месяц", value: 1 },
                { label: "3 месяца", value: 3 },
                { label: "6 месяцев", value: 6 },
                { label: "12 месяцев", value: 12 }
              ]} />
            </Form.Item>
            {isImmediateUpgrade && (
              <Form.Item
                name="acceptImmediateUpgradeNoCredit"
                valuePropName="checked"
                rules={[{
                  validator: (_, value) => value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Подтвердите условия немедленного перехода"))
                }]}
              >
                <Checkbox>Я понимаю, что остаток тарифа «Команда» не компенсируется</Checkbox>
              </Form.Item>
            )}
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
            {paymentOrder.payment?.provider === "mock" ? (
              <div className="billing-page__mock-qr" aria-label="Тестовый платёж без банковского QR">
                <SafetyCertificateOutlined />
                <span>TEST</span>
              </div>
            ) : paymentOrder.payment?.qrImage ? (
              <img className="billing-page__qr-image" src={paymentOrder.payment.qrImage} alt="QR-код для оплаты через СБП" />
            ) : (
              <div className="billing-page__mock-qr" aria-label="QR-код создаётся">
                <ClockCircleOutlined />
              </div>
            )}
            <div className="billing-page__checkout-details">
              <Tag color={paymentOrder.payment?.provider === "mock" ? "gold" : "blue"}>
                {paymentOrder.payment?.provider === "mock" ? "Тестовый контур" : "СБП · Банк Точка"}
              </Tag>
              <Typography.Title level={3}>{formatKopecks(paymentOrder.amountKopecks)}</Typography.Title>
              <Typography.Text strong>{paymentOrder.planName} · {paymentOrder.periodMonths} мес.</Typography.Text>
              <Typography.Text type="secondary">{transitionLabel(paymentOrder.transitionType)}</Typography.Text>
              <Typography.Text type="secondary">Заказ действует до {formatDate(paymentOrder.expiresAt, true)}</Typography.Text>
            </div>
            {paymentOrder.payment?.provider === "mock" ? (
              <Alert
                type="warning"
                showIcon
                message="Подтвердите тестовую оплату"
                description="Нажимая «Я оплатил», вы имитируете успешный webhook банка. Это действие действительно активирует или продлевает тариф."
              />
            ) : paymentTerminal ? (
              <Alert
                type={paymentOrder.status === "expired" ? "warning" : "error"}
                showIcon
                message={paymentOrder.status === "expired" ? "Время оплаты истекло" : "Платёж не завершён"}
                description="Закройте окно и создайте новый платёж. Если деньги уже списались, не повторяйте оплату и обратитесь в поддержку."
              />
            ) : paymentOrder.payment?.status === "creation_unknown" ? (
              <Alert
                type="warning"
                showIcon
                message="Банк не подтвердил создание QR"
                description="Повторный QR не создаётся автоматически, чтобы исключить двойную оплату. Этот заказ закроется по истечении срока; затем можно будет создать новый. Если оплата всё же поступит, webhook восстановит заказ по его номеру."
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="Отсканируйте QR-код в приложении банка"
                description="Окно можно оставить открытым: Taskspot автоматически получит подтверждение банка и активирует тариф."
              />
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
