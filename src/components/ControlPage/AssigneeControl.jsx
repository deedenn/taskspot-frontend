import { Alert, Button, Pagination, Select, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PersonAvatar, WorkspaceTasks } from "./WorkspaceTasks.jsx";

function AssigneeTasks({ group, projectId }) {
  const [data, setData] = useState({ tasks: group.tasks, pagination: { page: 1, limit: 10, total: group.total } });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (page === 1) { setData({ tasks: group.tasks, pagination: { page: 1, limit: 10, total: group.total } }); setBusy(false); setError(""); return; }
    let live = true;
    const controller = new AbortController();
    const query = new URLSearchParams({ assignee: group.key, page: String(page), limit: "10" });
    if (projectId) query.set("projectId", projectId);
    setBusy(true); setError("");
    apiFetch("/workspace/tasks?" + query, { signal: controller.signal })
      .then((result) => { if (live) setData(result); })
      .catch((error) => { if (live) setError(error.message); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; controller.abort(); };
  }, [page, group, projectId, revision]);
  return <>
    {error && <Alert type="error" message={error} action={<Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>} />}
    <WorkspaceTasks tasks={error ? [] : data.tasks} pagination={data.pagination} onPage={setPage} loading={busy} />
  </>;
}

export function AssigneeControl() {
  const [params, setParams] = useSearchParams();
  const projectId = params.get("projectId") || "";
  const assignee = params.get("assignee") || "";
  const page = Number(params.get("page")) || 1;
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ people: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: "10" });
    if (projectId) query.set("projectId", projectId);
    if (assignee) query.set("assignee", assignee);
    setLoading(true); setError(""); setData(null);
    apiFetch("/workspace/assignees?" + query, { signal: controller.signal })
      .then((result) => { if (live) { setData(result); setFilters({ people: result.people, projects: result.projects }); } })
      .catch((error) => { if (live) setError(error.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [projectId, assignee, page, revision]);
  function change(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value)); else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "projectId") next.delete("assignee");
    setParams(next);
  }
  return <section className="assignee-control">
    <Typography.Title level={1}>Контроль по ответственным</Typography.Title>
    <div className="assignee-control__filters">
      <Select aria-label="Проект контроля" placeholder="Все проекты" allowClear showSearch optionFilterProp="label"
        value={projectId || undefined} options={filters.projects.map((project) => ({ value: project._id, label: project.name }))} onChange={(value) => change("projectId", value)} />
      <Select aria-label="Ответственный контроля" placeholder="Все ответственные" allowClear showSearch optionFilterProp="label"
        value={assignee || undefined} options={filters.people} onChange={(value) => change("assignee", value)} />
    </div>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>} />}
    {loading && <Typography.Paragraph role="status">Загрузка…</Typography.Paragraph>}
    {!loading && !error && !data?.groups.length && <Typography.Paragraph>Задач пока нет</Typography.Paragraph>}
    {data?.groups.map((group) => <section className="assignee-control__person" key={group.key}>
      <Space><PersonAvatar user={group.user} name={group.name} /><Typography.Title level={2}>{group.name}</Typography.Title></Space>
      <div className="assignee-control__summary">
        <Tag>Всего: {group.total}</Tag><Tag color="blue">Открыто: {group.open}</Tag>
        <Tag color="gold">В работе: {group.inProgress}</Tag><Tag color="purple">Проверка: {group.review}</Tag><Tag>Закрыто: {group.closed}</Tag>
      </div>
      <AssigneeTasks group={group} projectId={projectId} />
    </section>)}
    {data?.pagination.total > 10 && <Pagination current={data.pagination.page} pageSize={10} total={data.pagination.total} showSizeChanger={false} onChange={(value) => change("page", value)} />}
  </section>;
}
