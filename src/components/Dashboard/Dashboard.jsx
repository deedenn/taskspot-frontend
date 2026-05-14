import {
  CheckCircleOutlined,
  ClearOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
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

const priorityLabels = {
  low: ["Низкий", "default"],
  medium: ["Обычный", "blue"],
  high: ["Высокий", "orange"],
  urgent: ["Срочно", "red"]
};

const statItems = [
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

function isDueSoon(task) {
  if (!task?.dueDate || task.status === "closed") return false;

  const daysLeft = dayjs(task.dueDate).startOf("day").diff(dayjs().startOf("day"), "day");
  return daysLeft <= 1;
}

function isUrgentActive(task) {
  return task?.priority === "urgent" && !["review", "done", "closed"].includes(task.status);
}

function TaskList({ tasks }) {
  if (!tasks?.length) return <Empty description="Задач пока нет" />;

  return (
    <List
      dataSource={tasks}
      renderItem={(task) => {
        const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;
        const className = [
          "dashboard__task-item",
          isDueSoon(task) ? "dashboard__task-item--due" : "",
          isUrgentActive(task) ? "dashboard__task-item--urgent" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <List.Item className={className}>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Tag className="dashboard__project-tag" color="cyan">
                    {task.project?.name || "Без проекта"}
                  </Tag>
                  <Link className="dashboard__task-link" to={`/app/tasks/${task._id}`}>
                    {task.description}
                  </Link>
                  <Tag color={priorityColor}>{priorityLabel}</Tag>
                  <Tag color={statusLabels[task.status]?.[1]}>{statusLabels[task.status]?.[0]}</Tag>
                </Space>
              }
              description={
                <span className={isDueSoon(task) ? "dashboard__due-date dashboard__due-date--soon" : "dashboard__due-date"}>
                  Срок {dayjs(task.dueDate).format("DD.MM.YYYY")}
                  {isDueSoon(task) && <Tag color="red">срок близко</Tag>}
                </span>
              }
            />
          </List.Item>
        );
      }}
    />
  );
}

function idOf(value) {
  return value?._id || value;
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

  const categoryNameMap = useMemo(() => {
    const map = new Map();

    projects.forEach((project) => {
      project.categories.forEach((category) => {
        map.set(category._id, category.name);
      });
    });

    return map;
  }, [projects]);

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
              ? task.dueDate && dayjs(task.dueDate).isBefore(today, "day") && !["review", "done", "closed"].includes(task.status)
              : quickFilter === "review"
                ? ["review", "done"].includes(task.status)
                : quickFilter === "unassigned"
                  ? !task.assignee && !task.assigneeEmail && task.status !== "closed"
                  : true;

      return matchesClosed && matchesProject && matchesCategories && matchesSearch && matchesQuick;
    });
  }

  const visibleTasks = useMemo(
    () => ({
      initiated: applyTaskFilters(data.initiated),
      assigned: applyTaskFilters(data.assigned),
      observing: applyTaskFilters(data.observing)
    }),
    [data, hideClosed, projectFilter, categoryFilter, searchText, categoryNameMap, quickFilter]
  );

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
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          dueDate: values.dueDate.toISOString(),
          checklist: (values.checklistText || "")
            .split("\n")
            .map((text) => ({ text: text.trim() }))
            .filter((item) => item.text),
          attachments: (values.attachments || []).filter((item) => item?.name && item?.url),
          recurrence: {
            enabled: values.frequency && values.frequency !== "none",
            frequency: values.frequency || "none"
          }
        })
      });
      message.success("Задача создана");
      form.resetFields();
      setDrawerOpen(false);
      await loadDashboard();
    } catch (error) {
      message.error(error.message);
    }
  }

  return (
    <section className="dashboard">
      <div className="dashboard__head">
        <div>
          <Typography.Title level={1}>Главная</Typography.Title>
          <Typography.Paragraph>Задачи по всем проектам и ролям.</Typography.Paragraph>
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

      <div className="dashboard__stats">
        {statItems.map((item) => (
          <Card key={item.key} loading={loading} className="dashboard__stat-card">
            <Statistic title={item.title} value={visibleTasks[item.key].length} prefix={item.icon} />
            <div className="dashboard__stat-compact" aria-label={`${item.title}: ${visibleTasks[item.key].length}`}>
              {item.icon}
              <strong>{visibleTasks[item.key].length}</strong>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard__grid">
        <Card className="dashboard__tasks" loading={loading}>
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
          <Tabs
            items={[
              {
                key: "initiated",
                label: "Я инициатор",
                children: <TaskList tasks={visibleTasks.initiated} />
              },
              {
                key: "assigned",
                label: "Я ответственный",
                children: <TaskList tasks={visibleTasks.assigned} />
              },
              {
                key: "observing",
                label: "Я наблюдатель",
                children: <TaskList tasks={visibleTasks.observing} />
              }
            ]}
          />
        </Card>
      </div>

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
            <Form.List name="attachments">
              {(fields, { add, remove }) => (
                <div className="dashboard__form-list">
                  <Typography.Text strong>Вложения ссылками</Typography.Text>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline" className="dashboard__attachment-row">
                      <Form.Item {...field} name={[field.name, "name"]}>
                        <Input placeholder="Название" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "url"]}>
                        <Input placeholder="https://..." />
                      </Form.Item>
                      <Button onClick={() => remove(field.name)}>Удалить</Button>
                    </Space>
                  ))}
                  <Button onClick={() => add()}>Добавить вложение</Button>
                </div>
              )}
            </Form.List>
          </Form>
        ) : (
          <Empty description="Сначала создайте проект" />
        )}
      </Drawer>
    </section>
  );
}
