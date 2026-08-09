import { CheckOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Progress, Space, Tag, Typography, message } from "antd";
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

export function BillingPage() {
  const [data, setData] = useState({ organizations: [], plans: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const active = data.organizations[0];

  return (
    <section className="billing-page">
      <div className="billing-page__head">
        <div>
          <Typography.Title level={1}>Тарифы и лимиты</Typography.Title>
          <Typography.Paragraph>
            Freemium-модель: бесплатный старт и платные командные функции по мере роста.
          </Typography.Paragraph>
        </div>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadBilling}
        />
      )}

      {active && (
        <Card loading={loading} title={`${active.organization.name} · ${active.plan.name}`}>
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
                disabled={active?.plan.key === plan.key}
                onClick={() => message.info("Заявка на счёт появится после подключения биллинга")}
              >
                {active?.plan.key === plan.key ? "Подключён" : "Запросить счёт"}
              </Button>
              {active?.plan.key !== plan.key && (
                <Alert
                  type="info"
                  showIcon
                  message="Платёжный сценарий ещё не подключён"
                />
              )}
            </Space>
          </Card>
        ))}
      </div>
    </section>
  );
}
