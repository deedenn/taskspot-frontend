import { Alert, Button, Empty, Pagination, Select, Skeleton, Typography } from "antd";
import { DownOutlined, ReloadOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
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
    setPage(1);
    setData({ tasks: group.tasks, pagination: { page: 1, limit: 10, total: group.total } });
    setBusy(false);
    setError("");
  }, [group.key, group.tasks, group.total, projectId]);

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
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>} />}
    {!error && <WorkspaceTasks compact tasks={data.tasks} pagination={data.pagination} onPage={setPage} loading={busy} emptyDescription="У этого ответственного нет задач в текущем фильтре" />}
  </>;
}

function assigneeType(group) {
  if (group.key === "unassigned") return "Без ответственного";
  if (group.key?.startsWith("pending:")) return "Ожидает регистрации";
  if (!group.user) return "Удалённый пользователь";
  return "Участник";
}

function workloadPercent(value, total) {
  if (!total) return "0%";
  return `${Math.max(0, Math.round((value / total) * 100))}%`;
}

function AssigneeMetrics({ group }) {
  const metrics = [
    ["Открыто", group.open, "open"],
    ["В работе", group.inProgress, "progress"],
    ["На проверке", group.review, "review"],
    ["Закрыто", group.closed, "closed"]
  ];

  return <span className="assignee-control__metrics" aria-label={`Метрики ${group.name}`}>
    {metrics.map(([label, value, tone]) => <span className={`assignee-control__metric assignee-control__metric--${tone}`} key={label}>
      <strong>{value}</strong>
      <span>{label}</span>
    </span>)}
  </span>;
}

function WorkloadStrip({ group }) {
  const active = group.total - group.closed;
  return <span className="assignee-control__rail" aria-label={`Нагрузка: открыто ${group.open}, в работе ${group.inProgress}, на проверке ${group.review}, закрыто ${group.closed}`}>
    <span className="assignee-control__rail-caption">Активно {active}</span>
    <span className="assignee-control__strip" aria-hidden="true">
      <span className="assignee-control__strip-open" style={{ width: workloadPercent(group.open, group.total) }} />
      <span className="assignee-control__strip-progress" style={{ width: workloadPercent(group.inProgress, group.total) }} />
      <span className="assignee-control__strip-review" style={{ width: workloadPercent(group.review, group.total) }} />
      <span className="assignee-control__strip-closed" style={{ width: workloadPercent(group.closed, group.total) }} />
    </span>
  </span>;
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
  const [expanded, setExpanded] = useState(() => new Set(assignee ? [assignee] : []));

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

  useEffect(() => {
    setExpanded(assignee ? new Set([assignee]) : new Set());
  }, [assignee]);

  const totals = useMemo(() => {
    const groups = data?.groups || [];
    const currentPage = groups.reduce((summary, group) => ({
      people: summary.people + 1,
      tasks: summary.tasks + group.total,
      active: summary.active + group.total - group.closed
    }), { people: 0, tasks: 0, active: 0 });
    return { ...currentPage, people: data?.pagination?.total || currentPage.people };
  }, [data?.groups, data?.pagination?.total]);
  const hasActiveFilters = Boolean(projectId || assignee);

  function change(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value)); else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "projectId") next.delete("assignee");
    setParams(next);
  }

  function resetFilters() {
    setParams(new URLSearchParams());
  }

  function toggleGroup(key) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return <section className="assignee-control">
    <div className="assignee-control__toolbar">
      <div className="assignee-control__heading">
        <Typography.Title level={1}>Контроль по ответственным</Typography.Title>
        <Typography.Paragraph>
          Сводка нагрузки по людям, статусам и задачам в работе.
        </Typography.Paragraph>
        {!loading && !error && data && (
          <Typography.Text className="assignee-control__result" role="status" aria-live="polite">
            Ответственных: {totals.people} · В показанных группах: {totals.tasks} задач · Активных: {totals.active}
          </Typography.Text>
        )}
      </div>
      <div className="assignee-control__filters" aria-label="Фильтры контроля по ответственным">
        <Select aria-label="Проект контроля" placeholder="Все проекты" allowClear showSearch optionFilterProp="label"
          value={projectId || undefined} options={filters.projects.map((project) => ({ value: project._id, label: project.name }))} onChange={(value) => change("projectId", value)} />
        <Select aria-label="Ответственный контроля" placeholder="Все ответственные" allowClear showSearch optionFilterProp="label"
          value={assignee || undefined} options={filters.people} onChange={(value) => change("assignee", value)} />
        {hasActiveFilters && <Button aria-label="Сбросить фильтры" icon={<ReloadOutlined />} onClick={resetFilters}>Сбросить</Button>}
      </div>
    </div>

    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>} />}
    {loading && <div className="assignee-control__loading" role="status" aria-label="Загрузка ответственных">
      <Skeleton active avatar paragraph={{ rows: 2 }} />
      <Skeleton active avatar paragraph={{ rows: 2 }} />
    </div>}
    {!loading && !error && !data?.groups.length && <div className="assignee-control__empty">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={hasActiveFilters ? "По выбранным фильтрам задач нет" : "Задач пока нет"}
      />
      {hasActiveFilters && <Button onClick={resetFilters}>Сбросить фильтры</Button>}
    </div>}
    {!loading && !error && !!data?.groups.length && <div className="assignee-control__list">
      {data.groups.map((group) => {
        const isOpen = expanded.has(group.key);
        const contentId = `assignee-control-${group.key}`;
        const active = group.total - group.closed;
        const isUnassigned = group.key === "unassigned";
        return <section className={isUnassigned ? "assignee-control__person assignee-control__person--unassigned" : "assignee-control__person"} key={group.key}>
          <button
            type="button"
            className="assignee-control__person-toggle"
            aria-expanded={isOpen}
            aria-controls={contentId}
            aria-label={`${isOpen ? "Свернуть" : "Раскрыть"} задачи: ${group.name}`}
            onClick={() => toggleGroup(group.key)}
          >
            <span className="assignee-control__identity">
              <PersonAvatar user={group.user} name={group.name} size={40} />
              <span className="assignee-control__name-block">
                <span className="assignee-control__name" role="heading" aria-level="2">{group.name}</span>
                <span>{assigneeType(group)} · всего {group.total} · активно {active}</span>
              </span>
            </span>
            <AssigneeMetrics group={group} />
            <WorkloadStrip group={group} />
            <span className="assignee-control__chevron" aria-hidden="true">{isOpen ? <UpOutlined /> : <DownOutlined />}</span>
          </button>
          {isOpen && <div id={contentId} className="assignee-control__tasks">
            <AssigneeTasks group={group} projectId={projectId} />
          </div>}
        </section>;
      })}
    </div>}
    {data?.pagination.total > 10 && <Pagination className="assignee-control__pagination" current={data.pagination.page} pageSize={10} total={data.pagination.total} showSizeChanger={false} onChange={(value) => change("page", value)} />}
  </section>;
}
