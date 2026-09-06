import { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Select, Segmented, Table, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiFetch } from "../../api.js";
import "./PeriodReport.css";

export function PeriodReport() {
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [projectId, setProjectId] = useState();
  const [group, setGroup] = useState("projects");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const query = new URLSearchParams({ from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD"), ...(projectId ? { projectId } : {}) }).toString();
  useEffect(() => {
    let stale = false;
    setBusy(true); setError("");
    apiFetch("/reports/period?" + query).then((result) => { if (!stale) setData(result); })
      .catch((error) => { if (!stale) { setError(error.message); setData(null); } })
      .finally(() => { if (!stale) setBusy(false); });
    return () => { stale = true; };
  }, [query, reload]);
  async function download(exportGroup) {
    setExporting(true); setError("");
    try {
      const blob = await apiFetch("/reports/period?" + query + "&format=csv&group=" + exportGroup, { responseType: "blob" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = "taskspot-" + exportGroup + "-" + range[0].format("YYYY-MM-DD") + ".csv";
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error.message); }
    finally { setExporting(false); }
  }
  const daily = group === "daily";
  const columns = [
    { title: daily ? "Дата" : "Название", dataIndex: "name", width: 230, render: (value) => daily ? dayjs(value).format("DD.MM.YYYY") : value },
    { title: "Создано", dataIndex: "created", width: 100 },
    { title: "Закрыто", dataIndex: "closed", width: 100 },
    { title: "Закрыто ранее", dataIndex: "previousClosed", width: 130 },
    { title: "Разница", dataIndex: "closedDelta", width: 100, render: (value) => value > 0 ? "+" + value : value },
    ...(!daily ? [
      { title: "Активно сейчас", dataIndex: "active", width: 140 },
      { title: "Просрочено сейчас", dataIndex: "overdue", width: 150 },
      { title: "На проверке", dataIndex: "review", width: 130 },
      { title: "До закрытия, дней", dataIndex: "averageCloseDays", width: 150, render: (value) => value ?? "—" }
    ] : [])
  ];
  return <section className="period-report">
    <Typography.Title level={2}>Отчёты за период</Typography.Title>
    <div className="period-report__toolbar">
      <DatePicker.RangePicker aria-label="Период отчёта" value={range} allowClear={false} format="DD.MM.YYYY" onChange={(value) => value?.every(Boolean) && setRange(value)} />
      <Select aria-label="Проект отчёта" placeholder="Все проекты" allowClear showSearch optionFilterProp="label" value={projectId} onChange={setProjectId} options={data?.projectsFilter || []} />
      <Button icon={<DownloadOutlined aria-hidden="true" />} disabled={!data || busy} loading={exporting} onClick={() => download(group)}>CSV для Excel</Button>
      <Button icon={<DownloadOutlined aria-hidden="true" />} disabled={!data || busy} loading={exporting} onClick={() => download("tasks")}>Задачи CSV</Button>
    </div>
    {error && <Alert type="error" showIcon message={error} action={<Button icon={<ReloadOutlined aria-hidden="true" />} onClick={() => setReload((value) => value + 1)}>Повторить</Button>} />}
    <div className="period-report__summary" aria-busy={busy}>
      <div><span>Создано</span><strong>{busy ? "…" : data?.summary.created ?? "—"}</strong></div>
      <div><span>Закрыто</span><strong>{busy ? "…" : data?.summary.closed ?? "—"}</strong></div>
      <div><span>Закрыто в предыдущем периоде</span><strong>{busy ? "…" : data?.summary.previousClosed ?? "—"}</strong></div>
      <div><span>Среднее время закрытия, дней</span><strong>{busy ? "…" : data?.summary.averageCloseDays ?? "—"}</strong></div>
    </div>
    <Segmented aria-label="Группировка отчёта" value={group} onChange={setGroup} options={[{ label: "Проекты", value: "projects" }, { label: "Ответственные", value: "assignees" }, { label: "Категории", value: "categories" }, { label: "Дни", value: "daily" }]} />
    <Typography.Text type="secondary">Сравнение с предыдущим периодом той же длины. Время: Москва. Нагрузка указана на текущий момент.</Typography.Text>
    <Table rowKey="key" size="small" loading={busy} dataSource={busy ? [] : data?.[group] || []} columns={columns} scroll={{ x: daily ? 660 : 1220 }} pagination={{ pageSize: 20, hideOnSinglePage: true }} />
  </section>;
}
