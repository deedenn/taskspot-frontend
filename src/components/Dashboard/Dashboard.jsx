import {
  CheckCircleOutlined,
  ClearOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SendOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  Grid,
  message
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./Dashboard.css";

const statusLabels = {
  open: ["Открыта", "blue"],
  in_progress: ["В работе", "gold"],
  review: ["Проверка", "purple"],
  done: ["Проверка", "purple"],
  closed: ["Закрыта", "default"]
};

const priorityOptions = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочно" }
];

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

const priorityLabels = {
  low: ["Низкий", "default"],
  medium: ["Обычный", "blue"],
  high: ["Высокий", "orange"],
  urgent: ["Срочно", "red"]
};

const statusOrder = {
  open: 1,
  in_progress: 2,
  review: 3,
  done: 4,
  closed: 5
};

const priorityOrder = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4
};

const statItems = [
  {
    key: "all",
    title: "Все",
    icon: <UnorderedListOutlined />
  },
  {
    key: "initiated",
    title: "Инициатор",
    icon: <SendOutlined />
  },
  {
    key: "assigned",
    title: "Ответственный",
    icon: <CheckCircleOutlined />
  },
  {
    key: "observing",
    title: "Наблюдатель",
    icon: <EyeOutlined />
  }
];

function isActionable(task) {
  return !["review", "done", "closed"].includes(task?.status);
}

function isOverdue(task) {
  if (!task?.dueDate || !isActionable(task)) return false;

  return dayjs(task.dueDate).startOf("day").isBefore(dayjs().startOf("day"), "day");
}

function isDueSoon(task) {
  if (!task?.dueDate || !isActionable(task)) return false;

  const daysLeft = dayjs(task.dueDate).startOf("day").diff(dayjs().startOf("day"), "day");
  return daysLeft >= 0 && daysLeft <= 1;
}

function isDeadlineAlert(task) {
  return isOverdue(task) || isDueSoon(task);
}

function isUrgentActive(task) {
  return task?.priority === "urgent" && !["review", "done", "closed"].includes(task.status);
}

function idOf(value) {
  return value?._id || value;
}

function formatDateValue(date) {
  return date ? dayjs(date).valueOf() : Number.MAX_SAFE_INTEGER;
}

function TaskTable({ tasks, categoryMap }) {
  const columns = [
    {
      title: "Задача",
      dataIndex: "description",
      key: "description",
      width: 320,
      sorter: (first, second) => first.description.localeCompare(second.description, "ru"),
      render: (description, task) => (
        <Link className="dashboard__task-link" to={`/app/tasks/${task._id}`}>
          {description}
        </Link>
      )
    },
    {
      title: "Проект",
      dataIndex: ["project", "name"],
      key: "project",
      width: 180,
      sorter: (first, second) => (first.project?.name || "").localeCompare(second.project?.name || "", "ru"),
      render: (projectName) => projectName || "Без проекта"
    },
    {
      title: "Срок",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 170,
      defaultSortOrder: "ascend",
      sorter: (first, second) => formatDateValue(first.dueDate) - formatDateValue(second.dueDate),
      render: (dueDate, task) => (
        <span className={isDeadlineAlert(task) ? "dashboard__due-date dashboard__due-date--soon" : "dashboard__due-date"}>
          {dueDate ? dayjs(dueDate).format("DD.MM.YYYY") : "Без срока"}
          {isOverdue(task) && <Tag color="red">просрочено</Tag>}
          {!isOverdue(task) && isDueSoon(task) && <Tag color="red">скоро</Tag>}
        </span>
      )
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 140,
      sorter: (first, second) => (statusOrder[first.status] || 99) - (statusOrder[second.status] || 99),
      render: (status) => (
        <Tag color={statusLabels[status]?.[1]}>{statusLabels[status]?.[0] || status}</Tag>
      )
    },
    {
      title: "Категория",
      dataIndex: "categories",
      key: "categories",
      width: 220,
      render: (categories = []) => {
        const items = categories
          .map((category) => categoryMap.get(idOf(category)) || (category?.name ? { name: category.name, color: category.color } : null))
          .filter(Boolean);

        if (!items.length) {
          return <Typography.Text type="secondary">Без категории</Typography.Text>;
        }

        return (
          <Space size={[0, 6]} wrap>
            {items.map((category) => (
              <Tag key={category._id || category.name} color={category.color}>
                {category.name}
              </Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: "Приоритет",
      dataIndex: "priority",
      key: "priority",
      width: 130,
      sorter: (first, second) => (priorityOrder[first.priority] || 99) - (priorityOrder[second.priority] || 99),
      render: (priority) => {
        const [priorityLabel, priorityColor] = priorityLabels[priority] || priorityLabels.medium;
        return <Tag color={priorityColor}>{priorityLabel}</Tag>;
      }
    }
  ];

  return (
    <Table
      className="dashboard__task-table"
      columns={columns}
      dataSource={tasks}
      rowKey="_id"
      size="middle"
      scroll={{ x: 1060 }}
      rowClassName={(task) =>
        [
          isDeadlineAlert(task) ? "dashboard__task-row--due" : "",
          isUrgentActive(task) ? "dashboard__task-row--urgent" : ""
        ]
          .filter(Boolean)
          .join(" ")
      }
      pagination={tasks.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Задач пока нет" /> }}
    />
  );
}

export function Dashboard({ currentUser }) {
  const [data, setData] = useState({ initiated: [], assigned: [], observing: [], notifications: [] });
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);
  const [projectFilter, setProjectFilter] = useState();
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [quickFilter, setQuickFilter] = useState("active");
  const [activeRoleTab, setActiveRoleTab] = useState("all");
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isCompactControls = !screens.sm;
  const selectedProjectId = Form.useWatch("projectId", form);
  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId),
    [projects, selectedProjectId]
  );

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, projectsData] = await Promise.all([
        apiFetch("/dashboard"),
        apiFetch("/projects")
      ]);
      setData(dashboardData);
      setProjects(projectsData.projects);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project._id, label: project.name })),
    [projects]
  );

  const memberOptions = useMemo(
    () =>
      selectedProject?.members.map((member) => ({
        value: idOf(member.user),
        label: `${member.user.name} · ${member.user.email}`
      })) || [],
    [selectedProject]
  );

  const assigneeOptions = useMemo(
    () => [
      ...memberOptions,
      ...((selectedProject?.invitations || [])
        .filter((invitation) => invitation.status === "pending")
        .map((invitation) => ({
          value: `pending:${invitation.email}`,
          label: `${invitation.email} · ожидает регистрации`
        })))
    ],
    [memberOptions, selectedProject]
  );

  const categoryOptions = useMemo(
    () => selectedProject?.categories.map((category) => ({ value: category._id, label: category.name })) || [],
    [selectedProject]
  );

  const dashboardCategoryOptions = useMemo(() => {
    const sourceProjects = projectFilter
      ? projects.filter((project) => project._id === projectFilter)
      : projects;
    const categories = new Map();

    sourceProjects.forEach((project) => {
      project.categories.forEach((category) => {
        categories.set(category._id, {
          value: category._id,
          label: projectFilter ? category.name : `${category.name} · ${project.name}`
        });
      });
    });

    return Array.from(categories.values());
  }, [projects, projectFilter]);

  const categoryMap = useMemo(() => {
    const map = new Map();

    projects.forEach((project) => {
      project.categories.forEach((category) => {
        map.set(category._id, category);
      });
    });

    return map;
  }, [projects]);

  const categoryNameMap = useMemo(() => {
    const map = new Map();

    categoryMap.forEach((category, categoryId) => {
      map.set(categoryId, category.name);
    });

    return map;
  }, [categoryMap]);

  function taskSearchText(task) {
    const categoryNames = (task.categories || [])
      .map((categoryId) => categoryNameMap.get(idOf(categoryId)))
      .filter(Boolean)
      .join(" ");

    return [
      task.description,
      task.project?.name,
      task.creator?.name,
      task.creator?.email,
      task.assignee?.name,
      task.assignee?.email,
      task.assigneeEmail,
      task.observers?.map((observer) => `${observer.name} ${observer.email}`).join(" "),
      statusLabels[task.status]?.[0],
      priorityLabels[task.priority]?.[0],
      categoryNames
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function applyTaskFilters(tasks) {
    const query = searchText.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesClosed = !hideClosed || task.status !== "closed";
      const matchesProject = !projectFilter || idOf(task.project) === projectFilter;
      const taskCategories = new Set((task.categories || []).map((categoryId) => idOf(categoryId)));
      const matchesCategories =
        !categoryFilter.length || categoryFilter.every((categoryId) => taskCategories.has(categoryId));
      const matchesSearch = !query || taskSearchText(task).includes(query);
      const today = dayjs().startOf("day");
      const matchesQuick =
        quickFilter === "active"
          ? task.status !== "closed"
          : quickFilter === "today"
            ? task.dueDate && dayjs(task.dueDate).isSame(today, "day")
            : quickFilter === "overdue"
              ? isOverdue(task)
              : quickFilter === "review"
                ? ["review", "done"].includes(task.status)
                : quickFilter === "unassigned"
                  ? !task.assignee && !task.assigneeEmail && task.status !== "closed"
                  : true;

      return matchesClosed && matchesProject && matchesCategories && matchesSearch && matchesQuick;
    });
  }

  const allTasks = useMemo(() => {
    const tasksById = new Map();

    [...data.initiated, ...data.assigned, ...data.observing].forEach((task) => {
      tasksById.set(task._id, task);
    });

    return Array.from(tasksById.values());
  }, [data]);

  const visibleTasks = useMemo(
    () => ({
      all: applyTaskFilters(allTasks),
      initiated: applyTaskFilters(data.initiated),
      assigned: applyTaskFilters(data.assigned),
      observing: applyTaskFilters(data.observing)
    }),
    [allTasks, data, hideClosed, projectFilter, categoryFilter, searchText, categoryNameMap, quickFilter]
  );

  const activeView = statItems.find((item) => item.key === activeRoleTab) || statItems[0];
  const activeTasks = visibleTasks[activeRoleTab] || [];
  const activeOverdueCount = activeTasks.filter(isOverdue).length;
  const activeDueSoonCount = activeTasks.filter((task) => !isOverdue(task) && isDueSoon(task)).length;
  const activeUrgentCount = activeTasks.filter(isUrgentActive).length;

  function handleDashboardProjectChange(projectId) {
    setProjectFilter(projectId);
    setCategoryFilter([]);
  }

  function resetFilters() {
    setProjectFilter();
    setCategoryFilter([]);
    setSearchText("");
    setHideClosed(true);
    setQuickFilter("active");
  }

  function defaultAssignee(project) {
    const currentMember = project?.members.find((member) => idOf(member.user) === currentUser?._id);
    return currentMember ? idOf(currentMember.user) : idOf(project?.members[0]?.user);
  }

  function openCreateTask() {
    const firstProject = projects[0];
    if (firstProject && !form.getFieldValue("projectId")) {
      form.setFieldsValue({
        projectId: firstProject._id,
        assignee: defaultAssignee(firstProject),
        observers: [],
        categories: [],
        priority: "medium"
      });
    }
    setDrawerOpen(true);
  }

  function handleProjectChange(projectId) {
    const project = projects.find((item) => item._id === projectId);
    form.setFieldsValue({
      assignee: defaultAssignee(project),
      observers: [],
      categories: [],
      priority: form.getFieldValue("priority") || "medium"
    });
  }

  async function createTask(values) {
    setCreatingTask(true);
    try {
      const data = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...values,
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

      const failedUploads = [];
      for (const item of pendingAttachmentFiles) {
        const file = item.originFileObj;
        if (!file) continue;

        try {
          await uploadAttachmentForTask(data.task._id, file);
        } catch (error) {
          failedUploads.push(file.name);
        }
      }

      if (failedUploads.length) {
        message.warning(`Задача создана, но не удалось добавить файлов: ${failedUploads.join(", ")}`);
      } else {
        message.success(pendingAttachmentFiles.length ? "Задача создана, файлы добавлены" : "Задача создана");
      }

      form.resetFields();
      setPendingAttachmentFiles([]);
      setDrawerOpen(false);
      await loadDashboard();
    } catch (error) {
      message.error(error.message);
    } finally {
      setCreatingTask(false);
    }
  }

  async function uploadAttachmentForTask(taskId, file) {
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

    await apiFetch(`/tasks/${taskId}/attachments`, {
      method: "POST",
      body: JSON.stringify(presign.attachment)
    });
  }

  return (
    <section className="dashboard">
      <div className="dashboard__head">
        <div>
          <Typography.Title level={1}>Главная</Typography.Title>
          <Typography.Paragraph>Единый рабочий список по проектам, срокам и ролям.</Typography.Paragraph>
        </div>
        <Space wrap>
          {isCompactControls ? (
            <Tooltip title={hideClosed ? "Закрытые скрыты" : "Закрытые показаны"}>
              <Button
                className="dashboard__filter-button"
                type={hideClosed ? "primary" : "default"}
                icon={hideClosed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                aria-label={hideClosed ? "Показать закрытые задачи" : "Скрыть закрытые задачи"}
                onClick={() => setHideClosed((value) => !value)}
              />
            </Tooltip>
          ) : (
            <Space className="dashboard__filter" size={8}>
              <Typography.Text>Скрыть закрытые</Typography.Text>
              <Switch checked={hideClosed} onChange={setHideClosed} />
            </Space>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask} disabled={!projects.length}>
            Новая задача
          </Button>
        </Space>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadDashboard}
        />
      )}

      <div className="dashboard__stats" role="tablist" aria-label="Фильтр задач по роли">
        {statItems.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className={activeRoleTab === item.key ? "dashboard__stat-card dashboard__stat-card--active" : "dashboard__stat-card"}
            aria-label={`${item.title}: ${visibleTasks[item.key].length}`}
            aria-pressed={activeRoleTab === item.key}
            aria-selected={activeRoleTab === item.key}
            onClick={() => setActiveRoleTab(item.key)}
          >
            <div className="dashboard__stat-content" aria-label={`${item.title}: ${visibleTasks[item.key].length}`}>
              <span className="dashboard__stat-icon">{item.icon}</span>
              <span className="dashboard__stat-text">
                <strong>{visibleTasks[item.key].length}</strong>
                <span>{item.title}</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="dashboard__grid">
        <Card className="dashboard__tasks" loading={loading}>
          <div className="dashboard__table-head">
            <div>
              <Typography.Text className="dashboard__eyebrow">Рабочий список</Typography.Text>
              <Typography.Title level={2}>
                {activeView.key === "all" ? "Все задачи" : `Задачи: ${activeView.title.toLowerCase()}`}
              </Typography.Title>
            </div>
            <div className="dashboard__pulse" aria-label="Индикаторы задач">
              <span>
                <strong>{activeTasks.length}</strong>
                показано
              </span>
              <span className={activeOverdueCount ? "dashboard__pulse-item dashboard__pulse-item--danger" : "dashboard__pulse-item"}>
                <strong>{activeOverdueCount}</strong>
                просрочено
              </span>
              <span className={activeDueSoonCount ? "dashboard__pulse-item dashboard__pulse-item--warn" : "dashboard__pulse-item"}>
                <strong>{activeDueSoonCount}</strong>
                скоро
              </span>
              <span className={activeUrgentCount ? "dashboard__pulse-item dashboard__pulse-item--urgent" : "dashboard__pulse-item"}>
                <strong>{activeUrgentCount}</strong>
                срочно
              </span>
            </div>
          </div>
          <div className="dashboard__filters-panel">
            <Select
              allowClear
              className="dashboard__filter-select"
              placeholder="Все проекты"
              options={projectOptions}
              value={projectFilter}
              onChange={handleDashboardProjectChange}
            />
            <Select
              allowClear
              mode="multiple"
              className="dashboard__filter-select dashboard__filter-select--wide"
              placeholder="Все категории"
              options={dashboardCategoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              maxTagCount="responsive"
            />
            <Input.Search
              allowClear
              className="dashboard__filter-select dashboard__filter-select--wide"
              placeholder="Поиск по задачам"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <Select
              className="dashboard__filter-select"
              value={quickFilter}
              onChange={setQuickFilter}
              options={[
                { value: "active", label: "Активные" },
                { value: "today", label: "Сегодня" },
                { value: "overdue", label: "Просрочено" },
                { value: "review", label: "Ждут проверки" },
                { value: "unassigned", label: "Без ответственного" },
                { value: "all", label: "Все" }
              ]}
            />
            <Button icon={<ClearOutlined />} onClick={resetFilters}>
              Сбросить
            </Button>
          </div>
          <TaskTable tasks={activeTasks} categoryMap={categoryMap} />
        </Card>
      </div>

      <Drawer
        title="Новая задача"
        open={drawerOpen}
        width={screens.sm ? 520 : "100%"}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" loading={creatingTask} onClick={() => form.submit()}>
            Создать
          </Button>
        }
      >
        {projects.length ? (
          <Form form={form} layout="vertical" onFinish={createTask}>
            <Form.Item
              name="projectId"
              label="Проект"
              rules={[{ required: true, message: "Выберите проект" }]}
            >
              <Select options={projectOptions} onChange={handleProjectChange} />
            </Form.Item>
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
              <DatePicker className="dashboard__full-width" />
            </Form.Item>
            <Form.Item name="priority" label="Приоритет" initialValue="medium">
              <Select options={priorityOptions} />
            </Form.Item>
            <Form.Item name="categories" label="Категории">
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
            <Form.Item name="frequency" label="Повтор" initialValue="none">
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
            <div className="dashboard__create-attachments">
              <Typography.Text strong>Вложения</Typography.Text>
              <Upload.Dragger
                accept="*"
                disabled={creatingTask}
                beforeUpload={(file) => {
                  if (file.size > MAX_ATTACHMENT_SIZE) {
                    message.error("Файл должен быть меньше 20 МБ");
                    return Upload.LIST_IGNORE;
                  }

                  setPendingAttachmentFiles((files) => [
                    ...files.filter((item) => item.uid !== file.uid),
                    {
                      uid: file.uid,
                      name: file.name,
                      status: "done",
                      originFileObj: file
                    }
                  ]);
                  return false;
                }}
                fileList={pendingAttachmentFiles}
                multiple
                onRemove={(file) => {
                  setPendingAttachmentFiles((files) => files.filter((item) => item.uid !== file.uid));
                }}
                itemRender={(originNode, file, fileList, actions) => (
                  <div className="dashboard__create-attachment">
                    <span>
                      <PaperClipOutlined /> {file.name}
                    </span>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={actions.remove}
                    />
                  </div>
                )}
              >
                <p className="ant-upload-drag-icon">
                  <PaperClipOutlined />
                </p>
                <p className="ant-upload-text">Перетащите файлы или нажмите для выбора</p>
                <p className="ant-upload-hint">
                  Файлы будут загружены после создания задачи.
                </p>
              </Upload.Dragger>
            </div>
          </Form>
        ) : (
          <Empty description="Сначала создайте проект" />
        )}
      </Drawer>
    </section>
  );
}
