import { Alert, Card, Empty, List, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./OverdueTasks.css";

const statusLabels = {
  open: ["Открыта", "blue"],
  in_progress: ["В работе", "gold"],
  review: ["Проверка", "purple"],
  done: ["Проверка", "purple"],
  closed: ["Закрыта", "default"]
};

const priorityLabels = {
  low: ["Низкий", "default"],
  medium: ["Обычный", "blue"],
  high: ["Высокий", "orange"],
  urgent: ["Срочно", "red"]
};

function uniqueVisibleTasks(data) {
  const map = new Map();

  ["assigned", "initiated", "observing"].forEach((key) => {
    (data[key] || []).forEach((task) => {
      if (!map.has(task._id)) {
        map.set(task._id, task);
      }
    });
  });

  return Array.from(map.values());
}

function isOverdue(task) {
  return (
    task.dueDate &&
    !["review", "done", "closed"].includes(task.status) &&
    dayjs(task.dueDate).startOf("day").isBefore(dayjs().startOf("day"))
  );
}

export function OverdueTasks() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/dashboard");
      setTasks(uniqueVisibleTasks(data));
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const overdueTasks = useMemo(
    () => tasks.filter(isOverdue).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [tasks]
  );

  return (
    <section className="overdue-tasks">
      <div className="overdue-tasks__head">
        <div>
          <Typography.Title level={1}>Просроченные задачи</Typography.Title>
          <Typography.Paragraph>Открытые задачи, срок которых уже прошёл.</Typography.Paragraph>
        </div>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadTasks}
        />
      )}

      <Card loading={loading}>
        {overdueTasks.length ? (
          <>
            <Alert
              className="overdue-tasks__alert"
              type="error"
              showIcon
              message={`Просрочено задач: ${overdueTasks.length}`}
            />
            <List
              dataSource={overdueTasks}
              renderItem={(task) => {
                const [statusLabel, statusColor] = statusLabels[task.status] || [task.status, "default"];
                const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;

                return (
                  <List.Item className="overdue-tasks__item">
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color="cyan">{task.project?.name || "Без проекта"}</Tag>
                          <Link className="overdue-tasks__task-link" to={`/app/tasks/${task._id}`}>
                            {task.description}
                          </Link>
                          <Tag color={priorityColor}>{priorityLabel}</Tag>
                          <Tag color={statusColor}>{statusLabel}</Tag>
                        </Space>
                      }
                      description={
                        <span className="overdue-tasks__date">
                          Срок: {dayjs(task.dueDate).format("DD.MM.YYYY")}
                        </span>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </>
        ) : (
          <Empty description="Просроченных задач нет" />
        )}
      </Card>
    </section>
  );
}
