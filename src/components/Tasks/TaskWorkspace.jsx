import { CommentOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Drawer, Empty, Form, Grid, Input, List, Modal, Select, Space, Switch, Tag, Tooltip, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./TaskWorkspace.css";

const statusOptions = [
  { value: "open", label: "Открыта" },
  { value: "in_progress", label: "В работе" },
  { value: "review", label: "Проверка" },
  { value: "done", label: "Проверка" },
  { value: "closed", label: "Закрыта" }
];

const statusColor = {
  open: "blue",
  in_progress: "gold",
  review: "purple",
  done: "purple",
  closed: "default"
};

const priorityOptions = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочно" }
];

const priorityLabels = {
  low: ["Низкий", "default"],
  medium: ["Обычный", "blue"],
  high: ["Высокий", "orange"],
  urgent: ["Срочно", "red"]
};

function idOf(value) {
  return value?._id || value;
}

function isDueSoon(task) {
  if (!task?.dueDate || task.status === "closed") return false;

  const daysLeft = dayjs(task.dueDate).startOf("day").diff(dayjs().startOf("day"), "day");
  return daysLeft <= 1;
}

function isUrgentActive(task) {
  return task?.priority === "urgent" && !["review", "done", "closed"].includes(task.status);
}

export function TaskWorkspace({ project, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isCompactControls = !screens.sm;

  const memberOptions = useMemo(
    () =>
      project.members.map((member) => ({
        value: idOf(member.user),
        label: `${member.user.name} · ${member.user.email}`
      })),
    [project.members]
  );

  const assigneeOptions = useMemo(
    () => [
      ...memberOptions,
      ...(project.invitations || [])
        .filter((invitation) => invitation.status === "pending")
        .map((invitation) => ({
          value: `pending:${invitation.email}`,
          label: `${invitation.email} · ожидает регистрации`
        }))
    ],
    [memberOptions, project.invitations]
  );

  const categoryOptions = useMemo(
    () => project.categories.map((category) => ({ value: category._id, label: category.name })),
    [project.categories]
  );

  const categoryMap = useMemo(
    () => new Map(project.categories.map((category) => [category._id, category])),
    [project.categories]
  );

  const visibleTasks = useMemo(
    () => {
      const query = searchText.trim().toLowerCase();

      return tasks.filter((task) => {
        const matchesClosed = !hideClosed || task.status !== "closed";
        const categoryNames = (task.categories || [])
          .map((categoryId) => categoryMap.get(idOf(categoryId))?.name)
          .filter(Boolean)
          .join(" ");
        const searchableText = [
          task.description,
          task.creator?.name,
          task.creator?.email,
          task.assignee?.name,
          task.assignee?.email,
          task.assigneeEmail,
          task.observers?.map((observer) => `${observer.name} ${observer.email}`).join(" "),
          statusOptions.find((status) => status.value === task.status)?.label,
          priorityLabels[task.priority]?.[0],
          categoryNames
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = !query || searchableText.includes(query);

        return matchesClosed && matchesSearch;
      });
    },
    [tasks, hideClosed, searchText, categoryMap]
  );

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/tasks?projectId=${project._id}`);
      setTasks(data.tasks);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, [project._id]);

  async function createTask(values) {
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          projectId: project._id,
          dueDate: values.dueDate.toISOString(),
          checklist: (values.checklistText || "")
            .split("\n")
            .map((text) => ({ text: text.trim() }))
            .filter((item) => item.text),
          recurrence: {
            enabled: values.frequency && values.frequency !== "none",
            frequency: values.frequency || "none"
          }
        })
      });
      setDrawerOpen(false);
      form.resetFields();
      await loadTasks();
      message.success("Задача создана");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function changeStatus(task, status) {
    if (task.status === status) return;

    const nextStatusLabel = statusOptions.find((item) => item.value === status)?.label || status;
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: "Изменить статус задачи?",
        content: `Новый статус: ${nextStatusLabel}. Изменение попадёт в историю задачи.`,
        okText: "Изменить",
        cancelText: "Отмена",
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (!confirmed) return;

    try {
      const data = await apiFetch(`/tasks/${task._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setTasks((items) => items.map((item) => (item._id === task._id ? data.task : item)));
      message.success("Статус обновлён");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function addComment(task, values, resetForm) {
    try {
      const data = await apiFetch(`/tasks/${task._id}/comments`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      setTasks((items) => items.map((item) => (item._id === task._id ? data.task : item)));
      resetForm();
    } catch (error) {
      message.error(error.message);
    }
  }

  return (
    <Card
      title="Задачи"
      extra={
        <Space wrap>
          {isCompactControls ? (
            <Tooltip title={hideClosed ? "Закрытые скрыты" : "Закрытые показаны"}>
              <Button
                className="tasks__filter-button"
                type={hideClosed ? "primary" : "default"}
                icon={hideClosed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                aria-label={hideClosed ? "Показать закрытые задачи" : "Скрыть закрытые задачи"}
                onClick={() => setHideClosed((value) => !value)}
              />
            </Tooltip>
          ) : (
            <Space className="tasks__filter" size={8}>
              <Typography.Text>Скрыть закрытые</Typography.Text>
              <Switch checked={hideClosed} onChange={setHideClosed} />
            </Space>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            Задача
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Input.Search
        allowClear
        className="tasks__search"
        placeholder="Поиск по задачам"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadTasks}
        />
      )}
      {visibleTasks.length ? (
        <div className="tasks">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              categoryMap={categoryMap}
              onStatusChange={changeStatus}
              onComment={addComment}
            />
          ))}
        </div>
      ) : (
        <Empty description={hideClosed ? "Нет открытых задач" : "В этом проекте пока нет видимых задач"} />
      )}

      <Drawer
        title="Новая задача"
        open={drawerOpen}
        width={screens.sm ? 520 : "100%"}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={() => form.submit()}>
            Создать
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createTask}
          initialValues={{ assignee: currentUser?._id, observers: [], categories: [], priority: "medium", frequency: "none" }}
        >
          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: "Опишите задачу" }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="Срок выполнения"
            rules={[{ required: true, message: "Укажите срок" }]}
          >
            <DatePicker className="tasks__full-width" />
          </Form.Item>
          <Form.Item name="priority" label="Приоритет">
            <Select options={priorityOptions} />
          </Form.Item>
          <Form.Item
            name="categories"
            label="Категории"
          >
            <Select mode="multiple" options={categoryOptions} placeholder="Выберите категории" />
          </Form.Item>
          <Form.Item
            name="assignee"
            label="Ответственный"
          >
            <Select allowClear options={assigneeOptions} placeholder="Можно оставить без ответственного" />
          </Form.Item>
          <Form.Item name="observers" label="Наблюдатели">
            <Select mode="multiple" options={memberOptions} placeholder="Выберите наблюдателей" />
          </Form.Item>
          <Form.Item name="frequency" label="Повтор">
            <Select
              options={[
                { value: "none", label: "Не повторять" },
                { value: "daily", label: "Ежедневно" },
                { value: "weekly", label: "Еженедельно" },
                { value: "monthly", label: "Ежемесячно" }
              ]}
            />
          </Form.Item>
          <Form.Item name="checklistText" label="Чек-лист">
            <Input.TextArea rows={4} placeholder="Каждый пункт с новой строки" />
          </Form.Item>
          <Typography.Text type="secondary">
            Вложения можно добавить после создания задачи в её карточке.
          </Typography.Text>
        </Form>
      </Drawer>
    </Card>
  );
}

function TaskCard({ task, categoryMap, onStatusChange, onComment }) {
  const [commentForm] = Form.useForm();
  const status = statusOptions.find((item) => item.value === task.status);
  const assigneeLabel = task.assignee?.name || task.assigneeEmail || "не назначен";
  const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;
  const className = [
    "tasks__card",
    isDueSoon(task) ? "tasks__card--due" : "",
    isUrgentActive(task) ? "tasks__card--urgent" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <div className="tasks__topline">
        <Space wrap>
          <Tag color={statusColor[task.status]}>{status?.label}</Tag>
          <Tag color={priorityColor}>{priorityLabel}</Tag>
        </Space>
        <span className={isDueSoon(task) ? "tasks__due-date tasks__due-date--soon" : "tasks__due-date"}>
          Срок: {dayjs(task.dueDate).format("DD.MM.YYYY")}
          {isDueSoon(task) && <Tag color="red">срок близко</Tag>}
        </span>
      </div>
      <Typography.Title level={3}>
        <Link className="tasks__title-link" to={`/app/tasks/${task._id}`}>
          {task.description}
        </Link>
      </Typography.Title>
      <div className="tasks__meta">
        <span>Инициатор: {task.creator?.name}</span>
        <span>
          Ответственный: {assigneeLabel}
          {task.assigneeEmail && <Tag className="tasks__pending-tag">ожидает регистрации</Tag>}
        </span>
        <span>Наблюдатели: {task.observers?.map((observer) => observer.name).join(", ") || "нет"}</span>
      </div>
      <Space wrap className="tasks__categories">
        {task.categories?.map((categoryId) => {
          const category = categoryMap.get(idOf(categoryId));
          return category ? (
            <Tag key={category._id} color={category.color}>
              {category.name}
            </Tag>
          ) : null;
        })}
      </Space>
      <div className="tasks__controls">
        <Select
          value={task.status}
          options={statusOptions}
          onChange={(value) => onStatusChange(task, value)}
        />
      </div>
      <div className="tasks__comments">
        <Typography.Text strong>
          <CommentOutlined /> Комментарии
        </Typography.Text>
        {task.comments?.length ? (
          <List
            size="small"
            dataSource={task.comments}
            renderItem={(comment) => (
              <List.Item>
                <List.Item.Meta title={comment.author?.name} description={comment.text} />
              </List.Item>
            )}
          />
        ) : (
          <Typography.Text type="secondary">Комментариев пока нет</Typography.Text>
        )}
        <Form
          form={commentForm}
          onFinish={(values) => onComment(task, values, () => commentForm.resetFields())}
        >
          <Form.Item name="text" rules={[{ required: true, message: "Введите комментарий" }]}>
            <Input.TextArea rows={2} placeholder="Написать комментарий" />
          </Form.Item>
          <Button htmlType="submit">Отправить</Button>
        </Form>
      </div>
    </article>
  );
}
