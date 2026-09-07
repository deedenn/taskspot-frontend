import { Alert, Button, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { WorkspaceTasks } from "./WorkspaceTasks.jsx";

export function TaskSearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const projectId = params.get("projectId") || "";
  const page = Number(params.get("page")) || 1;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!q.trim()) { setData(null); setError(""); setLoading(false); return; }
    let live = true;
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    const query = new URLSearchParams({ q, page: String(page), limit: "20" });
    if (projectId) query.set("projectId", projectId);
    apiFetch("/workspace/tasks?" + query, { signal: controller.signal })
      .then((result) => { if (live) setData(result); })
      .catch((error) => { if (live) setError(error.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [q, page, projectId, revision]);
  function change(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value)); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  return <section>
    <Typography.Title level={1}>Поиск задач</Typography.Title>
    <Typography.Paragraph>{q ? "«" + q + "»" + (data ? " · найдено " + data.pagination.total : "") : "Введите запрос в строке поиска"}</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>} />}
    {!!data?.projects?.length && <div className="assignee-control__filters">
      <Select aria-label="Проект поиска" placeholder="Все проекты" allowClear value={projectId || undefined}
        options={data.projects.map((project) => ({ value: project._id, label: project.name }))} onChange={(value) => change("projectId", value)} />
    </div>}
    {q && !error && <WorkspaceTasks tasks={data?.tasks} pagination={data?.pagination} showAssignee loading={loading} onPage={(value) => change("page", value)} />}
  </section>;
}
