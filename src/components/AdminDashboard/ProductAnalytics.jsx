import { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Progress, Table, Typography } from "antd";
import dayjs from "dayjs";
import { apiFetch } from "../../api.js";
import "../ControlPage/PeriodReport.css";
export function ProductAnalytics() {
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(true), [reload, setReload] = useState(0);
  const query = new URLSearchParams({ from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD") }).toString();
  useEffect(() => {
    let stale = false;
    setBusy(true); setError("");
    apiFetch("/analytics/product?" + query).then((result) => { if (!stale) setData(result); })
      .catch((error) => { if (!stale) { setError(error.message); setData(null); } })
      .finally(() => { if (!stale) setBusy(false); });
    return () => { stale = true; };
  }, [query, reload]);
  return <section className="period-report">
    <Typography.Title level={2}>Развитие продукта</Typography.Title>
    <div className="period-report__toolbar"><DatePicker.RangePicker aria-label="Период регистраций" value={range} allowClear={false} format="DD.MM.YYYY" onChange={(value) => value?.every(Boolean) && setRange(value)} /></div>
    {error && <Alert type="error" message={error} action={<Button onClick={() => setReload((value) => value + 1)}>Повторить</Button>} />}
    <div className="period-report__summary">
      <div><span>Регистрации за период</span><strong>{busy ? "…" : data?.registered ?? "—"}</strong></div>
      <div><span>Без первой задачи</span><strong>{busy ? "…" : data?.withoutTask ?? "—"}</strong></div>
      <div><span>Возврат на 7-й день</span><strong>{busy || data?.d7.percent == null ? "—" : data.d7.percent + "%"}</strong></div>
      <div><span>Оплачено за период, ₽</span><strong>{busy ? "…" : data?.revenue?.toLocaleString("ru-RU") ?? "—"}</strong></div>
    </div>
    <Typography.Text type="secondary">Когорта: пользователи, зарегистрированные в выбранный период. Достижения на текущий момент, независимо друг от друга. Первая задача учитывается и в чужом проекте.</Typography.Text>
    <Table rowKey="key" loading={busy} dataSource={busy ? [] : data?.milestones || []} pagination={false} size="small" scroll={{ x: 600 }} columns={[
      { title: "Действие", dataIndex: "label", width: 280 },
      { title: "Пользователи", dataIndex: "value", width: 120 },
      { title: "От регистраций", dataIndex: "percent", width: 200, render: (value) => value == null ? "—" : <Progress percent={value} size="small" /> }
    ]} />
    <Typography.Text type="secondary">
      {data?.coverageStart ? "Наблюдение за посещениями с " + dayjs(data.coverageStart).format("DD.MM.YYYY") + ". " : "История посещений пока не накоплена. "}
      D7: {data?.d7.returned ?? 0} из {data?.d7.eligible ?? 0} пользователей с полным наблюдением. Оплаты учитываются по подтверждённым платежам, без возвратов и бесплатных назначений.
    </Typography.Text>
    <Typography.Title level={3}>Посещения по дням</Typography.Title>
    <Table rowKey="day" loading={busy} size="small" dataSource={busy ? [] : data?.daily || []} pagination={{ pageSize: 14, hideOnSinglePage: true }} columns={[
      { title: "Дата", dataIndex: "day", render: (value) => dayjs(value).format("DD.MM.YYYY") }, { title: "Активные пользователи", dataIndex: "active" }
    ]} />
  </section>;
}
