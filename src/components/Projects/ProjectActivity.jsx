import { HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, List, Pagination, Space, Spin, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import "./ProjectActivity.css";

const actions = {
  project_created: "Создан проект", settings_changed: "Изменены настройки",
  project_archived: "Проект архивирован", project_restored: "Проект восстановлен",
  avatar_changed: "Изменён аватар", member_added: "Добавлен участник",
  member_removed: "Удалён участник", role_changed: "Изменена роль",
  invitation_added: "Создано приглашение", invitation_removed: "Удалено приглашение",
  invitation_accepted: "Принято приглашение", invitation_resent: "Приглашение отправлено повторно",
  category_added: "Добавлена категория", category_removed: "Удалена категория",
  category_changed: "Изменена категория", task_template_added: "Добавлен шаблон задачи",
  task_template_removed: "Удалён шаблон задачи"
};

export function ProjectActivity({ projectId, revision }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setPage(1); setData({ items: [], total: 0 }); }, [projectId]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiFetch(`/projects/${projectId}/activity?page=${page}&limit=20`).then((result) => {
      if (!cancelled) setData(result);
    }).catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, projectId, revision, page, refresh]);
  return <>
    <Button icon={<HistoryOutlined aria-hidden="true" />} onClick={() => setOpen(true)}>Журнал</Button>
    <Drawer title="Журнал действий проекта" open={open} onClose={() => setOpen(false)}
      width="min(860px, 100vw)" className="project-activity"
      extra={<Tooltip title="Обновить журнал"><Button aria-label="Обновить журнал" icon={<ReloadOutlined />}
        loading={loading} onClick={() => setRefresh((value) => value + 1)} /></Tooltip>}>
      {error ? <Alert type="error" showIcon message="Не удалось загрузить журнал" description={error}
        action={<Button onClick={() => setRefresh((value) => value + 1)}>Повторить</Button>} /> :
        <Spin spinning={loading}>
          <List dataSource={data.items} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Журнал пока пуст" /> }}
            renderItem={(event) => <List.Item key={event._id}>
              <article className="project-activity__event">
                <time dateTime={event.at}>{new Date(event.at).toLocaleString("ru-RU")}</time>
                <div>
                  <strong>{actions[event.action] || "Изменён проект"}</strong>
                  <div className="project-activity__actor">{event.actorName}</div>
                  <div>{event.target}</div>
                  {(event.before || event.after) && <div className="project-activity__changes">
                    {event.before && <span><span className="project-activity__label">Было: </span>{event.before}</span>}
                    {event.after && <span><span className="project-activity__label">Стало: </span>{event.after}</span>}
                  </div>}
                </div>
              </article>
            </List.Item>} />
          <Space direction="vertical" className="project-activity__footer">
            <Pagination current={page} total={data.total} pageSize={20} showSizeChanger={false} size="small" onChange={setPage} hideOnSinglePage />
            {data.total >= data.capacity && <span>Последние {data.capacity} событий</span>}
          </Space>
        </Spin>}
    </Drawer>
  </>;
}
