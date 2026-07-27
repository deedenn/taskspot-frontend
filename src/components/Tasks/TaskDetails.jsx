import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RetweetOutlined,
  RollbackOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Form, Input, List, Modal, Select, Space, Spin, Tag, Timeline, Typography, Upload, message } from "antd";
import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../api.js";
import { fullName, userOptionLabel } from "../../utils/users.js";
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

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function idOf(value) {
  return value?._id || value;
}

function isUrgentActive(task) {
  return task?.priority === "urgent" && !["review", "done", "closed"].includes(task.status);
}

function isProjectArchived(project) {
  return Boolean(project?.isArchived || project?.archivedAt);
}

function formatFileSize(size) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
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

function normalizeIdList(value = []) {
  return value.map(idOf).filter(Boolean).sort();
}

function serializeDetails(values) {
  return JSON.stringify({
    description: values.description?.trim() || "",
    dueDate: values.dueDate ? dayjs(values.dueDate).toISOString() : null,
    assignee: values.assignee || "",
    observers: normalizeIdList(values.observers || []),
    categories: normalizeIdList(values.categories || [])
  });
}

export function TaskDetails({ currentUser }) {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsSaveStatus, setDetailsSaveStatus] = useState("idle");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [detailsForm] = Form.useForm();
  const [commentForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const detailsSaveTimerRef = useRef(null);
  const detailsSaveSnapshotRef = useRef("");
  const detailsChangeVersionRef = useRef(0);
  const applyingTaskToFormRef = useRef(false);

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

  useEffect(() => {
    if (!task) return;

    const nextValues = {
      description: task.description,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      assignee: idOf(task.assignee) || "",
      observers: (task.observers || []).map(idOf),
      categories: (task.categories || []).map(idOf)
    };

    applyingTaskToFormRef.current = true;
    detailsForm.setFieldsValue(nextValues);
    detailsSaveSnapshotRef.current = serializeDetails(nextValues);
    applyingTaskToFormRef.current = false;
  }, [detailsForm, task]);

  useEffect(
    () => () => {
      if (detailsSaveTimerRef.current) {
        clearTimeout(detailsSaveTimerRef.current);
      }
    },
    []
  );

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

  async function saveDetails(values, { silent = false, version = detailsChangeVersionRef.current } = {}) {
    const nextSnapshot = serializeDetails(values);

    if (nextSnapshot === detailsSaveSnapshotRef.current) {
      setDetailsSaveStatus("saved");
      return;
    }

    if (!values.description?.trim()) {
      setDetailsSaveStatus("error");
      if (!silent) message.warning("Опишите задачу");
      return;
    }

    setSaving(true);
    setDetailsSaveStatus("saving");
    try {
      const data = await apiFetch(`/tasks/${task._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: values.description.trim(),
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          assignee: values.assignee || "",
          observers: values.observers || [],
          categories: values.categories || []
        })
      });
      detailsSaveSnapshotRef.current = nextSnapshot;
      setDetailsSaveStatus("saved");

      if (version === detailsChangeVersionRef.current) {
        setTask(data.task);
      }

      if (!silent) message.success("Детали задачи обновлены");
    } catch (error) {
      setDetailsSaveStatus("error");
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDetailsChange(_, values) {
    if (applyingTaskToFormRef.current) return;

    detailsChangeVersionRef.current += 1;
    const version = detailsChangeVersionRef.current;
    setDetailsSaveStatus("dirty");

    if (detailsSaveTimerRef.current) {
      clearTimeout(detailsSaveTimerRef.current);
    }

    detailsSaveTimerRef.current = setTimeout(() => {
      void saveDetails(detailsForm.getFieldsValue(), { silent: true, version });
    }, 650);
  }

  function flushDetailsSave() {
    if (detailsSaveTimerRef.current) {
      clearTimeout(detailsSaveTimerRef.current);
      detailsSaveTimerRef.current = null;
    }

    void saveDetails(detailsForm.getFieldsValue(), { silent: true });
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

  async function addChecklistItem() {
    const text = newChecklistText.trim();

    if (!text) {
      message.warning("Введите пункт чек-листа");
      return;
    }

    setNewChecklistText("");
    await updateChecklist([...(task.checklist || []), { text, done: false }]);
  }

  async function deleteChecklistItem(index) {
    const checklist = (task.checklist || []).filter((_, itemIndex) => itemIndex !== index);
    await updateChecklist(checklist);
  }

  async function uploadAttachmentFile(file) {
    const presign = await apiFetch("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        taskId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size
      })
    });

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream"
      }
    });

    if (!uploadResponse.ok) {
      throw new Error("Не удалось загрузить файл в хранилище");
    }

    return presign.attachment;
  }

  async function addAttachmentFile(file) {
    setUploadingAttachment(true);
    try {
      const attachment = await uploadAttachmentFile(file);
      const data = await apiFetch(`/tasks/${taskId}/attachments`, {
        method: "POST",
        body: JSON.stringify(attachment)
      });
      setTask(data.task);
      message.success("Файл добавлен");
    } catch (error) {
      message.error(error.message);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function openAttachment(attachment) {
    try {
      const data = await apiFetch(`/tasks/${taskId}/attachments/${attachment._id}/download-url`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function deleteAttachment(attachment) {
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: "Удалить вложение?",
        content: `Файл «${attachment.name}» будет удалён из задачи.`,
        okText: "Удалить",
        okButtonProps: { danger: true },
        cancelText: "Отмена",
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (!confirmed) return;

    setDeletingAttachmentId(attachment._id);
    try {
      const data = await apiFetch(`/tasks/${taskId}/attachments/${attachment._id}`, {
        method: "DELETE"
      });
      setTask(data.task);
      message.success("Вложение удалено");
    } catch (error) {
      message.error(error.message);
    } finally {
      setDeletingAttachmentId("");
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
  const isProjectAdmin = task.project?.members?.some(
    (member) => idOf(member.user) === currentUser?._id && member.role === "admin"
  );
  const projectArchived = isProjectArchived(task.project);
  const canManageAttachments = !projectArchived && (isCreator || isAssignee || isProjectAdmin);
  const canSendToReview = !projectArchived && isAssignee && !["review", "done", "closed"].includes(task.status);
  const canReview = !projectArchived && isCreator && ["review", "done"].includes(task.status);
  const canEditDetails = !projectArchived && (isCreator || isProjectAdmin) && task.status !== "closed";
  const canEditChecklist = !projectArchived && (isCreator || isAssignee || isProjectAdmin);
  const canChangePriority = !projectArchived && isCreator && task.status !== "closed";
  const assigneeLabel = task.assignee ? fullName(task.assignee) : task.assigneeEmail || "не назначен";
  const dueDateLabel = task.dueDate ? dayjs(task.dueDate).format("DD.MM.YYYY") : "Без срока";
  const memberOptions = (task.project?.members || [])
    .map((member) => ({
      value: idOf(member.user),
      label: userOptionLabel(member.user)
    }))
    .filter((option) => option.value);
  const categoryOptions = (task.project?.categories || []).map((category) => ({
    value: idOf(category),
    label: category.name
  }));

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
                {task.project?.name} · срок {dueDateLabel}
              </Typography.Text>
            </Space>
            <Typography.Title level={1}>{task.description}</Typography.Title>
          </div>
        </div>

        <div className="task-details__meta">
          <Card>
            <Typography.Text type="secondary">Инициатор</Typography.Text>
            <strong>{fullName(task.creator)}</strong>
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
            <span>{task.observers?.map((observer) => fullName(observer)).join(", ") || "нет"}</span>
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

        {canEditDetails && (
          <Card className="task-details__editor">
            <div className="task-details__editor-head">
              <Typography.Title level={3}>Параметры задачи</Typography.Title>
              <Typography.Text className={`task-details__save-state task-details__save-state--${detailsSaveStatus}`}>
                {detailsSaveStatus === "saving"
                  ? "Сохраняем..."
                  : detailsSaveStatus === "dirty"
                    ? "Есть изменения"
                    : detailsSaveStatus === "error"
                      ? "Не сохранено"
                      : "Сохранено"}
              </Typography.Text>
            </div>
            <Form form={detailsForm} layout="vertical" onValuesChange={handleDetailsChange}>
              <Form.Item
                name="description"
                label="Описание"
                rules={[{ required: true, message: "Опишите задачу" }]}
              >
                <Input.TextArea rows={3} onBlur={flushDetailsSave} />
              </Form.Item>
              <div className="task-details__editor-grid">
                <Form.Item name="dueDate" label="Срок выполнения">
                  <DatePicker className="task-details__full-width" allowClear />
                </Form.Item>
                <Form.Item name="assignee" label="Ответственный">
                  <Select allowClear options={memberOptions} placeholder="Без ответственного" />
                </Form.Item>
                <Form.Item name="observers" label="Наблюдатели">
                  <Select mode="multiple" options={memberOptions} placeholder="Выберите наблюдателей" />
                </Form.Item>
                <Form.Item name="categories" label="Категории">
                  <Select mode="multiple" options={categoryOptions} placeholder="Выберите категории" />
                </Form.Item>
              </div>
            </Form>
          </Card>
        )}

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

        {projectArchived && (
          <Alert
            className="task-details__alert"
            type="info"
            showIcon
            message="Проект в архиве"
            description="Задача доступна только для просмотра. Изменение статуса, чек-листа, комментариев и вложений отключено."
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
              onClick={() => updateStatus("review")}
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
                onClick={() => updateStatus("closed")}
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
              <div className="task-details__checklist-item" key={item._id || index}>
                <Checkbox
                  checked={item.done}
                  disabled={!canEditChecklist || saving}
                  onChange={(event) => {
                    const checklist = task.checklist.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, done: event.target.checked } : entry
                    );
                    updateChecklist(checklist);
                  }}
                >
                  {item.text}
                </Checkbox>
                {canEditChecklist && (
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    aria-label="Удалить пункт чек-листа"
                    disabled={saving}
                    onClick={() => deleteChecklistItem(index)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Чек-листа нет" />
        )}
        {canEditChecklist && (
          <div className="task-details__checklist-add">
            <Input
              value={newChecklistText}
              placeholder="Добавить пункт чек-листа"
              disabled={saving}
              onChange={(event) => setNewChecklistText(event.target.value)}
              onPressEnter={addChecklistItem}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={saving}
              onClick={addChecklistItem}
            >
              Добавить
            </Button>
          </div>
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
          <div className="task-details__attachment-list">
            {task.attachments.map((attachment) => (
              <div className="task-details__attachment" key={attachment._id || attachment.url || attachment.key}>
                <span className="task-details__attachment-icon" aria-hidden="true">
                  <FileOutlined />
                </span>
                <div className="task-details__attachment-main">
                  <Typography.Text strong>{attachment.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {[formatFileSize(attachment.size), attachment.addedBy ? fullName(attachment.addedBy) : ""].filter(Boolean).join(" · ") || "Файл"}
                  </Typography.Text>
                </div>
                <Space className="task-details__attachment-actions">
                  <Button icon={<DownloadOutlined />} onClick={() => openAttachment(attachment)}>
                    Открыть
                  </Button>
                  {canManageAttachments && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingAttachmentId === attachment._id}
                      onClick={() => deleteAttachment(attachment)}
                    />
                  )}
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Вложений пока нет" />
        )}

        {canManageAttachments && (
          <div className="task-details__attachment-form">
            <Upload.Dragger
              accept="*"
              disabled={uploadingAttachment}
              beforeUpload={(file) => {
                if (file.size > MAX_ATTACHMENT_SIZE) {
                  message.error("Файл должен быть меньше 20 МБ");
                  return Upload.LIST_IGNORE;
                }

                void addAttachmentFile(file);
                return Upload.LIST_IGNORE;
              }}
              fileList={[]}
              maxCount={1}
              multiple={false}
            >
              <p className="ant-upload-drag-icon">
                <PaperClipOutlined />
              </p>
              <p className="ant-upload-text">
                {uploadingAttachment ? "Файл загружается..." : "Нажмите или перетащите файл"}
              </p>
              <p className="ant-upload-hint">
                Файл будет сохранён в хранилище и сразу прикреплён к задаче.
              </p>
            </Upload.Dragger>
          </div>
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
                    <strong>{fullName(activity.actor)}</strong>{" "}
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
                  title={fullName(comment.author)}
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

        {projectArchived ? (
          <Typography.Text type="secondary">Проект в архиве, новые комментарии отключены.</Typography.Text>
        ) : (
          <Form className="task-details__comment-form" form={commentForm} onFinish={addComment}>
            <Form.Item name="text" rules={[{ required: true, message: "Введите комментарий" }]}>
              <Input.TextArea rows={3} placeholder="Написать комментарий" />
            </Form.Item>
            <Button htmlType="submit">Отправить</Button>
          </Form>
        )}
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
