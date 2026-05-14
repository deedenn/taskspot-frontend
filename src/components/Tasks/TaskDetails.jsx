import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  HistoryOutlined,
  LinkOutlined,
  PaperClipOutlined,
  RetweetOutlined,
  RollbackOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, Empty, Form, Input, List, Modal, Select, Space, Spin, Tag, Timeline, Typography, message } from "antd";
import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./TaskDetails.css";

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

const priorityOptions = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочно" }
];

function idOf(value) {
  return value?._id || value;
}

function isUrgentActive(task) {
  return task?.priority === "urgent" && !["review", "done", "closed"].includes(task.status);
}

const activityLabels = {
  created: "создал задачу",
  status_changed: "изменил статус",
  description_changed: "изменил описание",
  due_date_changed: "изменил срок",
  categories_changed: "изменил категории",
  assignee_changed: "изменил ответственного",
  observers_changed: "изменил наблюдателей",
  priority_changed: "изменил приоритет",
  checklist_changed: "изменил чек-лист",
  attachment_added: "добавил вложение",
  recurrence_changed: "изменил повтор",
  comment_added: "добавил комментарий"
};

function formatActivity(activity) {
  if (activity.action === "status_changed") {
    const from = statusLabels[activity.from]?.[0] || activity.from;
    const to = statusLabels[activity.to]?.[0] || activity.to;
    return `${from} -> ${to}`;
  }

  if (activity.action === "due_date_changed") {
    const from = activity.from ? dayjs(activity.from).format("DD.MM.YYYY") : "не указан";
    const to = activity.to ? dayjs(activity.to).format("DD.MM.YYYY") : "не указан";
    return `${from} -> ${to}`;
  }

  if (activity.action === "priority_changed") {
    const from = priorityLabels[activity.from]?.[0] || activity.from;
    const to = priorityLabels[activity.to]?.[0] || activity.to;
    return `${from} -> ${to}`;
  }

  return activity.details || [activity.from, activity.to].filter(Boolean).join(" -> ");
}

export function TaskDetails({ currentUser }) {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [commentForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  async function loadTask() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/tasks/${taskId}`);
      setTask(data.task);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTask();
  }, [taskId]);

  async function updateStatus(status, extra = {}, requireConfirm = false) {
    if (requireConfirm) {
      const nextStatus = statusLabels[status]?.[0] || status;
      const confirmed = await new Promise((resolve) => {
        Modal.confirm({
          title: "Изменить статус задачи?",
          content: `Новый статус: ${nextStatus}. Изменение попадёт в историю задачи.`,
          okText: "Изменить",
          cancelText: "Отмена",
          onOk: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const data = await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...extra })
      });
      setTask(data.task);
      setReturnModalOpen(false);
      returnForm.resetFields();
      message.success("Статус обновлён");
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function returnToWork(values) {
    await updateStatus("in_progress", { comment: values.comment });
  }

  async function updatePriority(priority) {
    setSaving(true);
    try {
      const data = await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ priority })
      });
      setTask(data.task);
      message.success("Приоритет обновлён");
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateChecklist(checklist) {
    setSaving(true);
    try {
      const data = await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ checklist })
      });
      setTask(data.task);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function addAttachment(values) {
    const attachments = [...(task.attachments || []), values];
    setSaving(true);
    try {
      const data = await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ attachments })
      });
      setTask(data.task);
      message.success("Вложение добавлено");
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function addComment(values) {
    try {
      const data = await apiFetch(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      setTask(data.task);
      commentForm.resetFields();
    } catch (error) {
      message.error(error.message);
    }
  }

  const categoryMap = useMemo(() => {
    const categories = task?.project?.categories || [];
    return new Map(categories.map((category) => [category._id, category]));
  }, [task]);

  if (loading) {
    return (
      <div className="task-details__loader">
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <Card>
        <PageState
          type={error ? "error" : "empty"}
          title="Задача не найдена или недоступна"
          description={error}
          onAction={error ? loadTask : undefined}
        />
      </Card>
    );
  }

  const [statusLabel, statusColor] = statusLabels[task.status] || [task.status, "default"];
  const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;
  const isAssignee = idOf(task.assignee) === currentUser?._id;
  const isCreator = idOf(task.creator) === currentUser?._id;
  const canSendToReview = isAssignee && !["review", "done", "closed"].includes(task.status);
  const canReview = isCreator && ["review", "done"].includes(task.status);
  const canChangePriority = isCreator && task.status !== "closed";
  const assigneeLabel = task.assignee?.name || task.assigneeEmail || "не назначен";

  return (
    <section className="task-details">
      <Link className="task-details__back" to="/app/dashboard">
        <ArrowLeftOutlined /> Назад на главную
      </Link>

      <Card className={isUrgentActive(task) ? "task-details__main task-details__main--urgent" : "task-details__main"}>
        <div className="task-details__head">
          <div>
            <Space wrap>
              <Tag color={statusColor}>{statusLabel}</Tag>
              <Tag color={priorityColor}>{priorityLabel}</Tag>
              <Typography.Text type="secondary">
                {task.project?.name} · срок {dayjs(task.dueDate).format("DD.MM.YYYY")}
              </Typography.Text>
            </Space>
            <Typography.Title level={1}>{task.description}</Typography.Title>
          </div>
        </div>

        <div className="task-details__meta">
          <Card>
            <Typography.Text type="secondary">Инициатор</Typography.Text>
            <strong>{task.creator?.name}</strong>
            <span>{task.creator?.email}</span>
          </Card>
          <Card>
            <Typography.Text type="secondary">Ответственный</Typography.Text>
            <strong>{assigneeLabel}</strong>
            <span>{task.assignee?.email || (task.assigneeEmail ? "ожидает регистрации" : "")}</span>
          </Card>
          <Card>
            <Typography.Text type="secondary">Наблюдатели</Typography.Text>
            <strong>{task.observers?.length || 0}</strong>
            <span>{task.observers?.map((observer) => observer.name).join(", ") || "нет"}</span>
          </Card>
        </div>

        <Space wrap className="task-details__categories">
          {task.categories?.map((categoryId) => {
            const category = categoryMap.get(idOf(categoryId));
            return category ? (
              <Tag key={category._id} color={category.color}>
                {category.name}
              </Tag>
            ) : null;
          })}
        </Space>

        {canChangePriority && (
          <div className="task-details__priority-editor">
            <Typography.Text type="secondary">Приоритет</Typography.Text>
            <Select
              value={task.priority || "medium"}
              options={priorityOptions}
              disabled={saving}
              onChange={updatePriority}
            />
          </div>
        )}

        {task.recurrence?.enabled && (
          <Tag className="task-details__recurrence" icon={<RetweetOutlined />} color="blue">
            Повтор: {task.recurrence.frequency === "daily" ? "ежедневно" : task.recurrence.frequency === "monthly" ? "ежемесячно" : "еженедельно"}
          </Tag>
        )}

        {isUrgentActive(task) && (
          <Alert
            className="task-details__alert"
            type="error"
            showIcon
            message="Срочная задача. Подсветка сохранится до отправки на проверку или закрытия."
          />
        )}

        {canSendToReview && (
          <Alert
            className="task-details__alert"
            type="info"
            showIcon
            message="Когда работа готова, отправьте задачу инициатору на проверку."
          />
        )}

        {canReview && (
          <Alert
            className="task-details__alert"
            type="warning"
            showIcon
            message="Задача на проверке. Подтвердите выполнение или верните её ответственному на доработку."
          />
        )}

        <Space wrap className="task-details__actions">
          {canSendToReview && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={saving}
              onClick={() => updateStatus("review", {}, true)}
            >
              Выполнено
            </Button>
          )}
          {canReview && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={saving}
                onClick={() => updateStatus("closed", {}, true)}
              >
                Подтвердить выполнение
              </Button>
              <Button
                icon={<RollbackOutlined />}
                loading={saving}
                onClick={() => setReturnModalOpen(true)}
              >
                Отправить на доработку
              </Button>
            </>
          )}
          {task.status === "closed" && (
            <Tag icon={<CloseCircleOutlined />} color="default">
              Задача закрыта
            </Tag>
          )}
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <CheckCircleOutlined />
            Чек-лист
          </Space>
        }
      >
        {task.checklist?.length ? (
          <div className="task-details__checklist">
            {task.checklist.map((item, index) => (
              <Checkbox
                key={item._id || index}
                checked={item.done}
                disabled={saving || (!isAssignee && !isCreator)}
                onChange={(event) => {
                  const checklist = task.checklist.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, done: event.target.checked } : entry
                  );
                  updateChecklist(checklist);
                }}
              >
                {item.text}
              </Checkbox>
            ))}
          </div>
        ) : (
          <Empty description="Чек-листа нет" />
        )}
      </Card>

      <Card
        title={
          <Space>
            <PaperClipOutlined />
            Вложения
          </Space>
        }
      >
        {task.attachments?.length ? (
          <List
            dataSource={task.attachments}
            renderItem={(attachment) => (
              <List.Item>
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  <LinkOutlined /> {attachment.name}
                </a>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Вложений пока нет" />
        )}

        {(isCreator || isAssignee) && (
            <Form className="task-details__attachment-form" layout="vertical" onFinish={addAttachment}>
            <Form.Item name="name" label="Название вложения" rules={[{ required: true, message: "Название" }]}>
              <Input placeholder="Название" />
            </Form.Item>
            <Form.Item name="url" label="Ссылка на вложение" rules={[{ required: true, message: "Ссылка" }]}>
              <Input placeholder="https://..." />
            </Form.Item>
            <Button htmlType="submit" loading={saving}>Добавить</Button>
          </Form>
        )}
      </Card>

      <Card
        title={
          <Space>
            <HistoryOutlined />
            История
          </Space>
        }
      >
        {task.activities?.length ? (
          <Timeline
            items={[...task.activities]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((activity) => ({
                children: (
                  <div className="task-details__activity">
                    <strong>{activity.actor?.name || "Пользователь"}</strong>{" "}
                    <span>{activityLabels[activity.action] || activity.action}</span>
                    {formatActivity(activity) && <p>{formatActivity(activity)}</p>}
                    <Typography.Text type="secondary">
                      {dayjs(activity.createdAt).format("DD.MM.YYYY HH:mm")}
                    </Typography.Text>
                  </div>
                )
              }))}
          />
        ) : (
          <Empty description="История пока пуста" />
        )}
      </Card>

      <Card
        title={
          <Space>
            <CommentOutlined />
            Комментарии
          </Space>
        }
      >
        {task.comments?.length ? (
          <List
            dataSource={task.comments}
            renderItem={(comment) => (
              <List.Item>
                <List.Item.Meta
                  title={comment.author?.name}
                  description={
                    <>
                      <div>{comment.text}</div>
                      <Typography.Text type="secondary">
                        {dayjs(comment.createdAt).format("DD.MM.YYYY HH:mm")}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Комментариев пока нет" />
        )}

        <Form className="task-details__comment-form" form={commentForm} onFinish={addComment}>
          <Form.Item name="text" rules={[{ required: true, message: "Введите комментарий" }]}>
            <Input.TextArea rows={3} placeholder="Написать комментарий" />
          </Form.Item>
          <Button htmlType="submit">Отправить</Button>
        </Form>
      </Card>

      <Modal
        title="Отправить на доработку"
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        onOk={() => returnForm.submit()}
        okText="Отправить"
        cancelText="Отмена"
        confirmLoading={saving}
      >
        <Form form={returnForm} layout="vertical" onFinish={returnToWork}>
          <Form.Item
            name="comment"
            label="Комментарий"
            rules={[{ required: true, message: "Укажите, что нужно доработать" }]}
          >
            <Input.TextArea rows={4} placeholder="Что нужно исправить или доделать" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
