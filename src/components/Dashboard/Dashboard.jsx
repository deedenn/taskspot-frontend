import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  FolderAddOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ProjectOutlined,
  SendOutlined,
  TeamOutlined,
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
  Modal,
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
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, isLimitError, limitErrorText } from "../../api.js";
import { useApiResource } from "../../hooks/useApiResource.js";
import { fullName, userOptionLabel } from "../../utils/users.js";
import { PageState } from "../PageState/PageState.jsx";
import "./Dashboard.css";

const EMPTY_DASHBOARD_DATA = { initiated: [], assigned: [], observing: [], notifications: [] };

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

function isProjectArchived(project) {
  return Boolean(project?.isArchived || project?.archivedAt);
}

function formatDateValue(date) {
  return date ? dayjs(date).valueOf() : Number.MAX_SAFE_INTEGER;
}

function TaskCategories({ task, categoryMap }) {
  const items = (task.categories || [])
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

function TaskTable({ tasks, categoryMap, currentRoute }) {
  const columns = [
    {
      title: "Задача",
      dataIndex: "description",
      key: "description",
      width: 320,
      sorter: (first, second) => first.description.localeCompare(second.description, "ru"),
      render: (description, task) => (
        <Link className="dashboard__task-link" to={`/app/tasks/${task._id}`} state={{ returnTo: currentRoute }}>
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
      render: (projectName, task) => (
        <Space size={6} wrap>
          <span>{projectName || "Без проекта"}</span>
          {isProjectArchived(task.project) && <Tag color="default">Архив</Tag>}
        </Space>
      )
    },
    {
      title: "Ответственный",
      key: "assignee",
      width: 210,
      sorter: (first, second) => {
        const firstAssignee = first.assignee ? fullName(first.assignee) : first.assigneeEmail || "";
        const secondAssignee = second.assignee ? fullName(second.assignee) : second.assigneeEmail || "";
        return firstAssignee.localeCompare(secondAssignee, "ru");
      },
      render: (_, task) => {
        if (task.assignee) {
          return (
            <div className="dashboard__assignee-cell">
              <span>{fullName(task.assignee)}</span>
              {task.assignee.email && (
                <Typography.Text type="secondary">{task.assignee.email}</Typography.Text>
              )}
            </div>
          );
        }

        if (task.assigneeEmail) {
          return (
            <Space size={6} wrap>
              <Typography.Text>{task.assigneeEmail}</Typography.Text>
              <Tag color="gold">ждёт регистрации</Tag>
            </Space>
          );
        }

        return <Typography.Text type="secondary">Без ответственного</Typography.Text>;
      }
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
      render: (_, task) => <TaskCategories task={task} categoryMap={categoryMap} />
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
      scroll={{ x: 1270 }}
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

function TaskMobileList({ tasks, categoryMap, currentRoute }) {
  if (!tasks.length) {
    return (
      <div className="dashboard__mobile-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Задач пока нет" />
      </div>
    );
  }

  return (
    <div className="dashboard__mobile-list">
      {tasks.map((task) => {
        const [statusLabel, statusColor] = statusLabels[task.status] || [task.status, "default"];
        const [priorityLabel, priorityColor] = priorityLabels[task.priority] || priorityLabels.medium;
        const assigneeName = task.assignee
          ? fullName(task.assignee)
          : task.assigneeEmail || "Без ответственного";

        return (
          <Link
            key={task._id}
            className={[
              "dashboard__mobile-task",
              isDeadlineAlert(task) ? "dashboard__mobile-task--due" : "",
              isUrgentActive(task) ? "dashboard__mobile-task--urgent" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            to={`/app/tasks/${task._id}`}
            state={{ returnTo: currentRoute }}
          >
            <div className="dashboard__mobile-task-main">
              <Typography.Text strong>{task.description}</Typography.Text>
              <Typography.Text type="secondary">{task.project?.name || "Без проекта"}</Typography.Text>
            </div>
            <div className="dashboard__mobile-task-meta">
              <span>
                <Typography.Text type="secondary">Срок</Typography.Text>
                <strong className={isDeadlineAlert(task) ? "dashboard__mobile-task-date dashboard__mobile-task-date--alert" : "dashboard__mobile-task-date"}>
                  {task.dueDate ? dayjs(task.dueDate).format("DD.MM.YYYY") : "Без срока"}
                </strong>
              </span>
              <span>
                <Typography.Text type="secondary">Ответственный</Typography.Text>
                <strong>{assigneeName}</strong>
              </span>
            </div>
            <div className="dashboard__mobile-task-tags">
              <Tag color={statusColor}>{statusLabel}</Tag>
              <Tag color={priorityColor}>{priorityLabel}</Tag>
              <TaskCategories task={task} categoryMap={categoryMap} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function Dashboard({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);
  const [projectFilter, setProjectFilter] = useState();
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [quickFilter, setQuickFilter] = useState("active");
  const [activeRoleTab, setActiveRoleTab] = useState("all");
  const [quickProjectId, setQuickProjectId] = useState();
  const [quickDescription, setQuickDescription] = useState("");
  const [quickCreating, setQuickCreating] = useState(false);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingFirstProject, setCreatingFirstProject] = useState(false);
  const [form] = Form.useForm();
  const [firstProjectForm] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobileTaskList = !screens.md;
  const currentRoute = `${location.pathname}${location.search}`;
  const dashboardResource = useApiResource(async ({ signal }) => {
    const [dashboardData, projectsData] = await Promise.all([
      apiFetch("/dashboard", { signal }),
      apiFetch("/projects", { signal })
    ]);

    return {
      dashboard: dashboardData,
      projects: projectsData.projects
    };
  }, []);
  const data = dashboardResource.data?.dashboard || EMPTY_DASHBOARD_DATA;
  const projects = dashboardResource.data?.projects || [];
  const error = dashboardResource.error;
  const loading = dashboardResource.loading;

  function updateDashboardData(updater) {
    dashboardResource.setData((current) => {
      const currentDashboard = current?.dashboard || EMPTY_DASHBOARD_DATA;
      const nextDashboard = typeof updater === "function" ? updater(currentDashboard) : updater;

      return {
        dashboard: nextDashboard,
        projects: current?.projects || []
      };
    });
  }
  const selectedProjectId = Form.useWatch("projectId", form);
  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId),
    [projects, selectedProjectId]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => !isProjectArchived(project)),
    [projects]
  );

  async function loadDashboard(options) {
    try {
      return await dashboardResource.reload(options);
    } catch (error) {
      message.error(error.message);
      return null;
    }
  }

  const projectOptions = useMemo(
    () => projects.map((project) => ({
      value: project._id,
      label: isProjectArchived(project) ? `${project.name} · архив` : project.name
    })),
    [projects]
  );
  const createProjectOptions = useMemo(
    () => activeProjects.map((project) => ({ value: project._id, label: project.name })),
    [activeProjects]
  );
  const defaultQuickProjectId = useMemo(() => {
    const filteredProject = activeProjects.find((project) => project._id === projectFilter);
    return filteredProject?._id || activeProjects[0]?._id;
  }, [activeProjects, projectFilter]);

  useEffect(() => {
    const activeIds = new Set(activeProjects.map((project) => project._id));
    const filteredProject = activeProjects.find((project) => project._id === projectFilter);

    setQuickProjectId((currentProjectId) => {
      if (!activeProjects.length) return undefined;
      if (filteredProject) return filteredProject._id;
      if (currentProjectId && activeIds.has(currentProjectId)) return currentProjectId;
      return defaultQuickProjectId;
    });
  }, [activeProjects, defaultQuickProjectId, projectFilter]);

  const memberOptions = useMemo(
    () =>
      selectedProject?.members.map((member) => ({
        value: idOf(member.user),
        label: userOptionLabel(member.user)
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
      fullName(task.creator, ""),
      task.creator?.email,
      fullName(task.assignee, ""),
      task.assignee?.email,
      task.assigneeEmail,
      task.observers?.map((observer) => `${fullName(observer, "")} ${observer.email}`).join(" "),
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
  const reviewTasksForUserCount = useMemo(
    () => data.initiated.filter((task) => ["review", "done"].includes(task.status)).length,
    [data.initiated]
  );

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
  const isReviewFocusActive = activeRoleTab === "initiated" && quickFilter === "review";
  const activeOverdueCount = activeTasks.filter(isOverdue).length;
  const activeDueSoonCount = activeTasks.filter((task) => !isOverdue(task) && isDueSoon(task)).length;
  const activeUrgentCount = activeTasks.filter(isUrgentActive).length;
  const hasNoProjects = !loading && !error && projects.length === 0;
  const hasNoActiveProjects = !loading && !error && projects.length > 0 && activeProjects.length === 0;
  const needsProjectSetup = hasNoProjects || hasNoActiveProjects;
  const hasManyProjects = projects.length > 1;
  const hasManyActiveProjects = activeProjects.length > 1;
  const selectedProjectName = projects.find((project) => project._id === projectFilter)?.name;
  const selectedCategories = categoryFilter
    .map((categoryId) => {
      const category = categoryMap.get(categoryId);
      return category ? { id: categoryId, name: category.name } : null;
    })
    .filter(Boolean);
  const hasActiveFilters =
    Boolean(projectFilter) ||
    Boolean(categoryFilter.length) ||
    Boolean(searchText.trim()) ||
    !hideClosed ||
    quickFilter !== "active" ||
    activeRoleTab !== "all";
  const advancedFiltersCount = categoryFilter.length + (!hideClosed ? 1 : 0) + (projectFilter && !hasManyProjects ? 1 : 0);
  const quickFilterItems = [
    { key: "active", label: "Активные" },
    { key: "today", label: "Сегодня" },
    { key: "overdue", label: "Просрочено" },
    { key: "review", label: "На проверке", count: reviewTasksForUserCount },
    { key: "unassigned", label: "Без ответственного" }
  ];

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
    setActiveRoleTab("all");
  }

  function handleHideClosedChange(value) {
    setHideClosed(value);

    if (!value && quickFilter === "active") {
      setQuickFilter("all");
    }

    if (value && quickFilter === "all") {
      setQuickFilter("active");
    }
  }

  function handleRoleTabClick(roleKey) {
    setActiveRoleTab(roleKey);

    if (roleKey === "all" || quickFilter === "review") {
      setQuickFilter(hideClosed ? "active" : "all");
    }
  }

  function showReviewTasks() {
    setActiveRoleTab("initiated");
    setQuickFilter("review");
  }

  function handleQuickFilterClick(filterKey) {
    if (filterKey === "review") {
      showReviewTasks();
      return;
    }

    setQuickFilter(filterKey);
  }

  function defaultAssignee(project) {
    const currentMember = project?.members.find((member) => idOf(member.user) === currentUser?._id);
    return currentMember ? idOf(currentMember.user) : idOf(project?.members[0]?.user);
  }

  function openCreateTask() {
    const firstProject = activeProjects[0];
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

  function showLimitDialog(error) {
    if (!isLimitError(error)) return false;

    Modal.warning({
      title: "Лимит тарифа исчерпан",
      content: limitErrorText(error),
      okText: "Перейти в тарифы",
      onOk: () => navigate("/app/billing")
    });

    return true;
  }

  async function createFirstProject(values) {
    const name = values.name?.trim();

    if (!name) {
      message.warning("Укажите название проекта");
      return;
    }

    setCreatingFirstProject(true);
    try {
      const response = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: values.description?.trim() || undefined
        })
      });

      firstProjectForm.resetFields();
      setQuickProjectId(response.project._id);
      setProjectFilter(undefined);
      setCategoryFilter([]);
      setSearchText("");
      setHideClosed(true);
      setQuickFilter("active");
      setActiveRoleTab("all");
      await loadDashboard({ silent: true });
      message.success("Проект создан. Теперь можно добавить первую задачу.");
    } catch (error) {
      if (!showLimitDialog(error)) {
        message.error(error.message || "Не удалось создать проект");
      }
    } finally {
      setCreatingFirstProject(false);
    }
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
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
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
      if (!showLimitDialog(error)) {
        message.error(error.message);
      }
    } finally {
      setCreatingTask(false);
    }
  }

  async function createQuickTask() {
    const description = quickDescription.trim();

    if (!description) {
      message.warning("Опишите задачу");
      return;
    }

    if (!quickProjectId) {
      message.warning(activeProjects.length ? "Выберите проект" : "Сначала создайте активный проект");
      return;
    }

    setQuickCreating(true);
    try {
      const data = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId: quickProjectId,
          description
        })
      });

      updateDashboardData((currentData) => ({
        ...currentData,
        initiated: [
          data.task,
          ...currentData.initiated.filter((task) => task._id !== data.task._id)
        ]
      }));
      setQuickDescription("");
      setActiveRoleTab("all");
      setHideClosed(true);
      setQuickFilter("active");
      setProjectFilter(hasManyProjects ? quickProjectId : undefined);
      setCategoryFilter([]);
      setSearchText("");
      message.success("Задача создана");
      void loadDashboard();
    } catch (error) {
      if (!showLimitDialog(error)) {
        message.error(error.message || "Не удалось создать задачу. Попробуйте еще раз");
      }
    } finally {
      setQuickCreating(false);
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
          {needsProjectSetup ? (
            <Button
              type="primary"
              icon={<FolderAddOutlined />}
              loading={creatingFirstProject}
              onClick={() => firstProjectForm.submit()}
            >
              Создать проект
            </Button>
          ) : (
            <Tooltip title={!activeProjects.length && projects.length ? "Нет активных проектов для новых задач" : ""}>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask} disabled={!activeProjects.length}>
                Новая задача
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={loadDashboard}
        />
      )}

      {needsProjectSetup ? (
        <Card className="dashboard__tasks dashboard__tasks--setup">
          <div className="dashboard__table-head">
            <div>
              <Typography.Text className="dashboard__eyebrow">Первый вход</Typography.Text>
              <Typography.Title level={2}>
                {hasNoActiveProjects ? "Создайте активный проект" : "Создайте первый проект"}
              </Typography.Title>
            </div>
          </div>
          <div className="dashboard__empty-start">
            <div className="dashboard__empty-main">
              <span className="dashboard__empty-icon" aria-hidden="true">
                <FolderAddOutlined />
              </span>
              <Typography.Title level={3}>
                {hasNoActiveProjects ? "Все проекты сейчас в архиве" : "Начните с рабочего пространства"}
              </Typography.Title>
              <Typography.Paragraph>
                Проект объединяет задачи, участников, категории и сроки. Создайте его прямо здесь, а затем добавьте
                первую задачу одной строкой на главной.
              </Typography.Paragraph>
              <Form
                form={firstProjectForm}
                layout="vertical"
                className="dashboard__setup-form"
                onFinish={createFirstProject}
              >
                <Form.Item
                  name="name"
                  label="Название проекта"
                  rules={[{ required: true, message: "Укажите название проекта" }]}
                >
                  <Input placeholder="Например: Отдел продаж" maxLength={80} />
                </Form.Item>
                <Form.Item name="description" label="Описание">
                  <Input.TextArea
                    rows={3}
                    placeholder="Необязательно. Можно указать, какие поручения будут в проекте."
                    maxLength={300}
                  />
                </Form.Item>
                <Space className="dashboard__empty-actions" wrap>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    loading={creatingFirstProject}
                  >
                    Создать проект
                  </Button>
                  <Button size="large" onClick={() => navigate("/app/projects")}>
                    Открыть раздел проектов
                  </Button>
                </Space>
              </Form>
            </div>
            <div className="dashboard__empty-preview" aria-label="Что сделать после создания проекта">
              <div className="dashboard__setup-step">
                <span className="dashboard__setup-step-icon">
                  <ProjectOutlined />
                </span>
                <div>
                  <span>Шаг 1</span>
                  <strong>Создайте проект</strong>
                </div>
              </div>
              <div className="dashboard__setup-step">
                <span className="dashboard__setup-step-icon">
                  <TeamOutlined />
                </span>
                <div>
                  <span>Шаг 2</span>
                  <strong>Пригласите участников</strong>
                </div>
              </div>
              <div className="dashboard__setup-step">
                <span className="dashboard__setup-step-icon">
                  <ArrowRightOutlined />
                </span>
                <div>
                  <span>Шаг 3</span>
                  <strong>Поставьте первую задачу</strong>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="dashboard__grid">
            <Card className="dashboard__tasks" loading={loading}>
              <div className="dashboard__table-head">
                <div>
                  <Typography.Text className="dashboard__eyebrow">Рабочий список</Typography.Text>
                  <Typography.Title level={2}>
                    {isReviewFocusActive
                      ? "Задачи на проверке"
                      : activeView.key === "all"
                        ? "Все задачи"
                        : `Задачи: ${activeView.title.toLowerCase()}`}
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
              <div className="dashboard__workbar">
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
                      onClick={() => handleRoleTabClick(item.key)}
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

                <div className="dashboard__filter-line">
                  <div className="dashboard__quick-filters" aria-label="Быстрые фильтры задач">
                    {quickFilterItems.map((item) => {
                      const isActive = quickFilter === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={isActive ? "dashboard__quick-chip dashboard__quick-chip--active" : "dashboard__quick-chip"}
                          aria-pressed={isActive}
                          onClick={() => handleQuickFilterClick(item.key)}
                        >
                          <span>{item.label}</span>
                          {typeof item.count === "number" && <strong>{item.count}</strong>}
                        </button>
                      );
                    })}
                  </div>

                  <div className={hasManyProjects ? "dashboard__search-line" : "dashboard__search-line dashboard__search-line--compact"}>
                    <Input.Search
                      allowClear
                      className="dashboard__search"
                      placeholder="Поиск по задачам"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                    />
                    {hasManyProjects && (
                      <Select
                        allowClear
                        className="dashboard__project-filter"
                        placeholder="Все проекты"
                        options={projectOptions}
                        value={projectFilter}
                        onChange={handleDashboardProjectChange}
                      />
                    )}
                    <Button icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)}>
                      Фильтры{advancedFiltersCount ? ` · ${advancedFiltersCount}` : ""}
                    </Button>
                    {hasActiveFilters && (
                      <Button icon={<ClearOutlined />} onClick={resetFilters}>
                        Сбросить
                      </Button>
                    )}
                  </div>

                  {(selectedProjectName || selectedCategories.length || !hideClosed) && (
                    <div className="dashboard__active-filters" aria-label="Активные фильтры">
                      {selectedProjectName && (
                        <Tag
                          closable
                          onClose={(event) => {
                            event.preventDefault();
                            handleDashboardProjectChange();
                          }}
                        >
                          Проект: {selectedProjectName}
                        </Tag>
                      )}
                      {selectedCategories.map((category) => (
                        <Tag
                          key={category.id}
                          closable
                          onClose={(event) => {
                            event.preventDefault();
                            setCategoryFilter((items) => items.filter((categoryId) => categoryId !== category.id));
                          }}
                        >
                          Категория: {category.name}
                        </Tag>
                      ))}
                      {!hideClosed && (
                        <Tag
                          closable
                          onClose={(event) => {
                            event.preventDefault();
                            handleHideClosedChange(true);
                          }}
                        >
                          Закрытые показаны
                        </Tag>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div
                className={hasManyActiveProjects ? "dashboard__quick-add" : "dashboard__quick-add dashboard__quick-add--single-project"}
                aria-label="Быстрое добавление задачи"
              >
                {hasManyActiveProjects && (
                  <Select
                    className="dashboard__quick-project"
                    placeholder="Проект"
                    options={createProjectOptions}
                    value={quickProjectId}
                    onChange={setQuickProjectId}
                    disabled={quickCreating || !activeProjects.length}
                  />
                )}
                <Input
                  className="dashboard__quick-input"
                  placeholder={activeProjects.length ? "Что нужно сделать? Нажмите Enter, чтобы добавить" : "Нет активных проектов"}
                  value={quickDescription}
                  onChange={(event) => setQuickDescription(event.target.value)}
                  onPressEnter={createQuickTask}
                  disabled={quickCreating || !activeProjects.length}
                  maxLength={240}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={quickCreating}
                  disabled={!activeProjects.length}
                  onClick={createQuickTask}
                >
                  Добавить
                </Button>
                <Button onClick={openCreateTask} disabled={!activeProjects.length}>
                  Подробнее
                </Button>
              </div>
              {isMobileTaskList ? (
                <TaskMobileList tasks={activeTasks} categoryMap={categoryMap} currentRoute={currentRoute} />
              ) : (
                <TaskTable tasks={activeTasks} categoryMap={categoryMap} currentRoute={currentRoute} />
              )}
            </Card>
          </div>
        </>
      )}

      <Drawer
        title="Фильтры задач"
        open={filtersOpen}
        width={screens.sm ? 420 : "100%"}
        onClose={() => setFiltersOpen(false)}
        extra={
          <Button icon={<ClearOutlined />} onClick={resetFilters} disabled={!hasActiveFilters}>
            Сбросить
          </Button>
        }
      >
        <div className="dashboard__filters-drawer">
          <div className="dashboard__drawer-field">
            <Typography.Text strong>Категории</Typography.Text>
            <Select
              allowClear
              mode="multiple"
              placeholder="Все категории"
              options={dashboardCategoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              maxTagCount="responsive"
            />
          </div>
          <div className="dashboard__drawer-switch">
            <div>
              <Typography.Text strong>Показывать закрытые задачи</Typography.Text>
              <Typography.Paragraph type="secondary">
                По умолчанию закрытые задачи скрыты, чтобы рабочий список оставался коротким.
              </Typography.Paragraph>
            </div>
            <Switch checked={!hideClosed} onChange={(value) => handleHideClosedChange(!value)} />
          </div>
        </div>
      </Drawer>

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
        {activeProjects.length ? (
          <Form form={form} layout="vertical" onFinish={createTask}>
            <Form.Item
              name="projectId"
              label="Проект"
              rules={[{ required: true, message: "Выберите проект" }]}
            >
              <Select options={createProjectOptions} onChange={handleProjectChange} />
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
          <Empty description={projects.length ? "Нет активных проектов для новых задач" : "Сначала создайте проект"} />
        )}
      </Drawer>
    </section>
  );
}
