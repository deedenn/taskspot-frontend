import { Avatar, Empty, List, Pagination, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { Link, useLocation } from "react-router-dom";
import "./WorkspaceTasks.css";

const statuses = { open: ["Открыта", "blue"], in_progress: ["В работе", "gold"], review: ["На проверке", "purple"], done: ["На проверке", "purple"], closed: ["Закрыта", "default"] };
export function PersonAvatar({ user, name, size = 32 }) {
  const label = name || [user?.name, user?.lastName].filter(Boolean).join(" ");
  return <Avatar src={user?.avatarUrl} alt={label} size={size}>{label?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "?"}</Avatar>;
}
export function WorkspaceTasks({ tasks = [], pagination, onPage, loading = false, showAssignee = false, compact = false, emptyDescription = "Задач не найдено" }) {
  const location = useLocation();
  return <div className={compact ? "workspace-tasks workspace-tasks--compact" : "workspace-tasks"}>
    <List loading={loading} dataSource={tasks} locale={{ emptyText: <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      renderItem={(task) => <List.Item className="workspace-tasks__row">
        <div className="workspace-tasks__title">
          <Link to={"/app/tasks/" + task._id} state={{ returnTo: location.pathname + location.search }}>{task.description}</Link>
          <Typography.Text type="secondary">{task.project?.name}{(task.project?.isArchived || task.project?.archivedAt) ? " · архив" : ""}</Typography.Text>
        </div>
        {showAssignee && <Space className="workspace-tasks__person">
          <PersonAvatar user={task.assignee} />
          <span>{task.assignee ? [task.assignee.name, task.assignee.lastName].filter(Boolean).join(" ") : task.assigneeEmail || "Без ответственного"}</span>
        </Space>}
        <span className="workspace-tasks__date">{task.dueDate ? dayjs(task.dueDate).format("DD.MM.YYYY") : "Без срока"}</span>
        <Tag color={statuses[task.status]?.[1]}>{statuses[task.status]?.[0] || task.status}</Tag>
      </List.Item>} />
    {pagination && pagination.total > pagination.limit && <Pagination size="small" current={pagination.page} pageSize={pagination.limit}
      total={pagination.total} showSizeChanger={false} onChange={onPage} disabled={loading} />}
  </div>;
}
