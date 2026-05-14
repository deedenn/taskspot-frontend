import { Badge, Button, Calendar, Card, Empty, Grid, List, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./CalendarPage.css";

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

function uniqueTasks(data) {
  const map = new Map();

  ["initiated", "assigned", "observing"].forEach((key) => {
    (data[key] || []).forEach((task) => {
      if (!map.has(task._id)) {
        map.set(task._id, task);
      }
    });
  });

  return Array.from(map.values());
}

export function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/dashboard");
      setTasks(uniqueTasks(data));
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

  const tasksByDate = useMemo(() => {
    const map = new Map();

    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = dayjs(task.dueDate).format("YYYY-MM-DD");
      map.set(key, [...(map.get(key) || []), task]);
    });

    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate.get(selectedDate.format("YYYY-MM-DD")) || [];
  const agendaDates = useMemo(
    () => Array.from(tasksByDate.entries()).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)),
    [tasksByDate]
  );

  function cellRender(value) {
    const dayTasks = tasksByDate.get(value.format("YYYY-MM-DD")) || [];
    if (!dayTasks.length) return null;

    const urgentCount = dayTasks.filter((task) => task.priority === "urgent" && !["review", "done", "closed"].includes(task.status)).length;

    return (
      <ul className="calendar-page__badges">
        <li>
          <Badge status={urgentCount ? "error" : "processing"} text={`${dayTasks.length} задач`} />
        </li>
      </ul>
    );
  }

  return (
    <section className="calendar-page">
      <div className="calendar-page__head">
        <div>
          <Typography.Title level={1}>Календарь задач</Typography.Title>
          <Typography.Paragraph>Задачи по срокам выполнения из всех доступных проектов.</Typography.Paragraph>
        </div>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadTasks}
        />
      )}

      <div className="calendar-page__grid">
        <Card loading={loading} className="calendar-page__calendar">
          {isMobile ? (
            agendaDates.length ? (
              <div className="calendar-page__agenda">
                {agendaDates.map(([date, dayTasks]) => (
                  <Button
                    key={date}
                    type={selectedDate.format("YYYY-MM-DD") === date ? "primary" : "default"}
                    onClick={() => setSelectedDate(dayjs(date))}
                  >
                    <span>{dayjs(date).format("DD.MM.YYYY")}</span>
                    <Badge count={dayTasks.length} size="small" />
                  </Button>
                ))}
              </div>
            ) : (
              <Empty description="Задач с датами пока нет" />
            )
          ) : (
            <Calendar value={selectedDate} onSelect={setSelectedDate} cellRender={cellRender} />
          )}
        </Card>

        <Card
          className="calendar-page__list"
          title={selectedDate.format("DD.MM.YYYY")}
          loading={loading}
        >
          {selectedTasks.length ? (
            <List
              dataSource={selectedTasks}
              renderItem={(task) => {
                const [statusLabel, statusColor] = statusLabels[task.status] || [task.status, "default"];
                const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;

                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Link className="calendar-page__task-link" to={`/app/tasks/${task._id}`}>
                            {task.description}
                          </Link>
                          <Tag color={priorityColor}>{priorityLabel}</Tag>
                          <Tag color={statusColor}>{statusLabel}</Tag>
                        </Space>
                      }
                      description={task.project?.name || "Без проекта"}
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty description="На этот день задач нет" />
          )}
        </Card>
      </div>
    </section>
  );
}
