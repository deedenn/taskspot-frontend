import React, { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Typography,
  Segmented,
  Select,
  Space,
  Tag,
  message,
  Drawer,
} from 'antd';
import dayjs from 'dayjs';
import MainLayout from './layout/MainLayout';
import ProjectBoard from './pages/ProjectBoard/ProjectBoard';
import TaskList from './pages/TaskList/TaskList';
import TaskForm from './components/Task/TaskForm';
import CategoryForm from './components/Category/CategoryForm';
import TaskDetailsModal from './components/Task/TaskDetailsModal';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import LandingPage from './pages/Marketing/LandingPage';
import ProjectMembers from './components/Project/ProjectMembers';
import ProjectList from './components/Project/ProjectList';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserSidebar from './components/User/UserSidebar';
import UserEfficiency from './components/User/UserEfficiency';
import { STATUS_META } from './constants/statusMeta';
import {
  initialTasks,
  initialCategories,
  initialUsers,
  initialProjects,
} from './mock/mockData';
import './App.css';

const { Title, Text } = Typography;

function App() {
  const [users, setUsers] = useState(initialUsers);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [categories, setCategories] = useState(initialCategories);

  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [registerError, setRegisterError] = useState(null);

  const [screen, setScreen] = useState('landing'); // 'landing' | 'login' | 'register' | 'app'

  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormMode, setTaskFormMode] = useState('create'); // 'create' | 'edit'
  const [taskToEdit, setTaskToEdit] = useState(null);

  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [projectFormName, setProjectFormName] = useState('');
  const [projectFormDescription, setProjectFormDescription] = useState('');

  const [isProjectMembersDrawerOpen, setProjectMembersDrawerOpen] =
    useState(false);
  const [isProjectsDrawerOpen, setProjectsDrawerOpen] = useState(false);

  const [userSection, setUserSection] = useState('assigned');

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminSection, setAdminSection] = useState('stats');

  const [landingStats, setLandingStats] = useState({
    visits: 1, // первый заход на лендинг
    registerClicks: 0,
  });

  const accessibleProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isAdmin) return projects;
    return projects.filter(
      (p) =>
        p.ownerId === currentUser._id ||
        (p.memberIds && p.memberIds.includes(currentUser._id))
    );
  }, [currentUser, projects]);

  const activeProjects = useMemo(
    () => accessibleProjects.filter((p) => p.status !== 'completed'),
    [accessibleProjects]
  );

  useEffect(() => {
    if (!currentUser) {
      setCurrentProjectId(null);
      setIsAdminMode(false);
      setAdminSection('stats');
      return;
    }
    if (!currentUser.isAdmin) {
      setIsAdminMode(false);
      setAdminSection('stats');
    }
    if (
      !currentProjectId ||
      !activeProjects.find((p) => p._id === currentProjectId)
    ) {
      if (activeProjects.length > 0) {
        setCurrentProjectId(activeProjects[0]._id);
      } else {
        setCurrentProjectId(null);
      }
    }
  }, [currentUser, activeProjects, currentProjectId]);

  const currentProject = useMemo(
    () => projects.find((p) => p._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const registerLandingVisit = () => {
    setLandingStats((prev) => ({
      ...prev,
      visits: prev.visits + 1,
    }));
  };

  const registerRegisterClick = () => {
    setLandingStats((prev) => ({
      ...prev,
      registerClicks: prev.registerClicks + 1,
    }));
  };

  const handleLogin = (email, password) => {
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );
    if (!user) {
      setAuthError('Неверный email или пароль');
      return;
    }
    setCurrentUser(user);
    setAuthError(null);
    setRegisterError(null);
    setScreen('app');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthError(null);
    setRegisterError(null);
    setIsAdminMode(false);
    setAdminSection('stats');
    registerLandingVisit();
    setScreen('landing');
  };

  const handleRegister = async ({ name, email, password }) => {
    const exists = users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      setRegisterError('Пользователь с таким email уже существует');
      return;
    }
    const newUser = {
      _id: `u${Date.now()}`,
      name,
      email,
      password,
      isAdmin: false,
    };
    setUsers((prev) => [...prev, newUser]);

    // Если на этот email были приглашения в проекты, добавляем пользователя в соответствующие проекты
    const normalizedEmail = email.toLowerCase();
    const now = dayjs();
    setProjects((prev) =>
      prev.map((p) => {
        const invitations = Array.isArray(p.invitations)
          ? p.invitations
          : [];
        let memberIds = new Set(p.memberIds || []);
        const updatedInvites = invitations.filter((inv) => {
          if (inv.email.toLowerCase() !== normalizedEmail) return true;
          const created = dayjs(inv.createdAt);
          const diffDays = now.diff(created, 'day');
          if (diffDays >= 7) {
            // Приглашение истекло, не добавляем участника, но оставляем запись
            return true;
          }
          // Приглашение актуально – добавляем пользователя и убираем приглашение
          memberIds.add(newUser._id);
          return false;
        });

        if (
          memberIds.size === (p.memberIds || []).length &&
          updatedInvites.length === invitations.length
        ) {
          return p;
        }

        return {
          ...p,
          memberIds: Array.from(memberIds),
          invitations: updatedInvites,
        };
      })
    );

    setCurrentUser(newUser);
    setAuthError(null);
    setRegisterError(null);
    setScreen('app');
  };

  const handleAdminCreateUser = ({ name, email, password, isAdmin }) => {
    const exists = users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      message.error('Пользователь с таким email уже существует');
      return false;
    }
    const newUser = {
      _id: `u${Date.now()}`,
      name,
      email,
      password,
      isAdmin: !!isAdmin,
    };
    setUsers((prev) => [...prev, newUser]);

    const normalizedEmail = email.toLowerCase();
    const now = dayjs();
    setProjects((prev) =>
      prev.map((p) => {
        const invitations = Array.isArray(p.invitations)
          ? p.invitations
          : [];
        let memberIds = new Set(p.memberIds || []);
        const updatedInvites = invitations.filter((inv) => {
          if (inv.email.toLowerCase() !== normalizedEmail) return true;
          const created = dayjs(inv.createdAt);
          const diffDays = now.diff(created, 'day');
          if (diffDays >= 7) {
            // Приглашение истекло, не добавляем участника, но оставляем запись
            return true;
          }
          memberIds.add(newUser._id);
          return false;
        });

        if (
          memberIds.size === (p.memberIds || []).length &&
          updatedInvites.length === invitations.length
        ) {
          return p;
        }

        return {
          ...p,
          memberIds: Array.from(memberIds),
          invitations: updatedInvites,
        };
      })
    );

    message.success('Пользователь создан');
    return true;
  };

  const handleTaskSubmit = async (payload, existingTask) => {
    if (!currentProject || !currentUser) return;
    setTaskFormLoading(true);
    try {
      const catObjects = categories.filter(
        (c) =>
          c.projectId === currentProject._id &&
          (payload.categories || []).includes(c._id)
      );
      const assigneeObj =
        users.find((u) => u._id === payload.assignee) || null;
      const watcherObjects = users.filter((u) =>
        (payload.watchers || []).includes(u._id)
      );

      if (existingTask) {
        if (existingTask.creatorId !== currentUser._id) {
          message.error('Редактировать задачу может только её создатель');
          return;
        }
        setTasks((prev) =>
          prev.map((t) =>
            t._id === existingTask._id
              ? {
                  ...t,
                  title: payload.title,
                  description: payload.description,
                  status: payload.status,
                  dueDate: payload.dueDate || null,
                  categories: catObjects,
                  assignee: assigneeObj,
                  watchers: watcherObjects,
                }
              : t
          )
        );
        setSelectedTask((prev) =>
          prev && prev._id === existingTask._id
            ? {
                ...prev,
                title: payload.title,
                description: payload.description,
                status: payload.status,
                dueDate: payload.dueDate || null,
                categories: catObjects,
                assignee: assigneeObj,
                watchers: watcherObjects,
              }
            : prev
        );
      } else {
        const newId = `t${Date.now()}`;
        const newTask = {
          _id: newId,
          projectId: currentProject._id,
          title: payload.title,
          description: payload.description,
          status: payload.status,
          dueDate: payload.dueDate || null,
          categories: catObjects,
          assignee: assigneeObj,
          watchers: watcherObjects,
          creatorId: currentUser._id,
          awaitingConfirmation: false,
        };
        setTasks((prev) => [...prev, newTask]);
      }
      setTaskModalOpen(false);
      setTaskToEdit(null);
      setTaskFormMode('create');
    } finally {
      setTaskFormLoading(false);
    }
  };

  const handleCreateCategory = async (payload) => {
    if (!currentProject) return;
    setCategoryFormLoading(true);
    try {
      const newId = `c${Date.now()}`;
      const newCategory = {
        _id: newId,
        projectId: currentProject._id,
        name: payload.name,
        color: payload.color || '#1677ff',
      };
      setCategories((prev) => [...prev, newCategory]);
      setCategoryModalOpen(false);
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId ? { ...task, status: newStatus } : task
      )
    );
    setSelectedTask((prev) =>
      prev && prev._id === taskId ? { ...prev, status: newStatus } : prev
    );
  };

  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskDetails = () => {
    setSelectedTask(null);
  };

  const handleProjectChange = (projectId) => {
    setCurrentProjectId(projectId);
  };

  const handleOpenProjectModal = () => {
    setProjectFormName('');
    setProjectFormDescription('');
    setProjectModalOpen(true);
  };

  const handleCreateProject = () => {
    if (!currentUser) return;
    if (!projectFormName.trim()) return;
    const newId = `p${Date.now()}`;
    const newProject = {
      _id: newId,
      name: projectFormName.trim(),
      description: projectFormDescription.trim(),
      ownerId: currentUser._id,
      memberIds: [currentUser._id],
      status: 'active',
    };
    setProjects((prev) => [...prev, newProject]);
    setProjectModalOpen(false);
    setCurrentProjectId(newId);
  };

  const handleAddMember = (email) => {
    if (!currentProject) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      message.error('Введите email');
      return;
    }

    const existingUser = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    const token = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const createdAt = new Date().toISOString();

    setProjects((prev) =>
      prev.map((p) => {
        if (p._id !== currentProject._id) return p;

        const memberIds = new Set(p.memberIds || []);
        let invitations = Array.isArray(p.invitations)
          ? [...p.invitations]
          : [];

        if (existingUser) {
          // Пользователь уже зарегистрирован – сразу добавляем в участники
          memberIds.add(existingUser._id);
          // И убираем возможные старые приглашения на этот email
          invitations = invitations.filter(
            (inv) => inv.email.toLowerCase() !== normalizedEmail
          );
        } else {
          // Пользователь ещё не зарегистрирован – создаём новое приглашение
          const alreadyInvited = invitations.some(
            (inv) => inv.email.toLowerCase() === normalizedEmail
          );
          if (!alreadyInvited) {
            invitations.push({
              email: normalizedEmail,
              token,
              createdAt,
            });
          }
        }

        return {
          ...p,
          memberIds: Array.from(memberIds),
          invitations,
        };
      })
    );

    if (existingUser) {
      message.success(
        `Пользователь ${existingUser.email} добавлен в проект. Ему отправлено уведомление по email.`
      );
      // Здесь в реальном приложении должен быть вызов backend для отправки письма.
    } else {
      const link = `https://taskspot.ru/register?invite=${token}`;
      message.success(
        `Приглашение отправлено на ${normalizedEmail}. Срок действия 7 дней. Ссылка для регистрации: ${link}`
      );
      // Здесь в реальном приложении должен быть вызов backend для отправки письма с этой ссылкой.
    }
  };

  const handleRemoveMember = (userId) => {
    if (!currentProject) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p._id !== currentProject._id) return p;
        if (userId === p.ownerId) {
          return p;
        }
        const memberIds = (p.memberIds || []).filter((id) => id !== userId);
        return { ...p, memberIds };
      })
    );
  };

  const handleRevokeInvite = (token) => {
    if (!currentProject) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p._id !== currentProject._id) return p;
        const invitations = Array.isArray(p.invitations)
          ? p.invitations
          : [];
        return {
          ...p,
          invitations: invitations.filter((inv) => inv.token !== token),
        };
      })
    );
  };

  const handleChangeProjectStatus = (projectId, newStatus) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p._id === projectId ? { ...p, status: newStatus } : p
      );

      if (currentProjectId === projectId && newStatus === 'completed') {
        if (currentUser) {
          const accessible = currentUser.isAdmin
            ? updated
            : updated.filter(
                (p) =>
                  p.ownerId === currentUser._id ||
                  (p.memberIds || []).includes(currentUser._id)
              );
          const active = accessible.filter(
            (p) => p.status !== 'completed'
          );
          setCurrentProjectId(active.length ? active[0]._id : null);
        } else {
          setCurrentProjectId(null);
        }
      }

      return updated;
    });
  };

  const isCurrentUserProjectOwner =
    currentUser &&
    currentProject &&
    (currentUser.isAdmin || currentProject.ownerId === currentUser._id);

  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    const forProject = tasks.filter(
      (t) => t.projectId === currentProject._id
    );
    if (!currentUser) return [];

    if (currentUser.isAdmin) return forProject;

    return forProject.filter((task) => {
      if (task.creatorId === currentUser._id) return true;
      const assigneeId =
        typeof task.assignee === 'string'
          ? task.assignee
          : task.assignee?._id;
      if (assigneeId === currentUser._id) return true;
      const watcherIds = (task.watchers || []).map((w) =>
        typeof w === 'string' ? w : w._id
      );
      if (watcherIds.includes(currentUser._id)) return true;
      return false;
    });
  }, [tasks, currentProject, currentUser]);

  const myTasksCount = useMemo(() => {
    if (!currentUser || !currentProject) return 0;
    return projectTasks.filter((t) => t.creatorId === currentUser._id)
      .length;
  }, [projectTasks, currentUser, currentProject]);

  const assignedTasksCount = useMemo(() => {
    if (!currentUser || !currentProject) return 0;
    return projectTasks.filter((t) => {
      const assigneeId =
        typeof t.assignee === 'string'
          ? t.assignee
          : t.assignee?._id;
      return assigneeId === currentUser._id;
    }).length;
  }, [projectTasks, currentUser, currentProject]);

  const overdueTasksCount = useMemo(() => {
    if (!currentUser || !currentProject) return 0;
    const today = dayjs().startOf('day');
    return projectTasks.filter((t) => {
      const assigneeId =
        typeof t.assignee === 'string'
          ? t.assignee
          : t.assignee?._id;
      if (assigneeId !== currentUser._id) return false;
      if (!t.dueDate) return false;
      const due = dayjs(t.dueDate);
      return (
        due.startOf('day').isBefore(today) &&
        t.status !== STATUS_META.closed.key
      );
    }).length;
  }, [projectTasks, currentUser, currentProject]);

  const filteredProjectTasks = useMemo(() => {
    if (!currentProject) return [];
    switch (userSection) {
      case 'mine':
        return projectTasks.filter(
          (t) => t.creatorId === currentUser?._id
        );
      case 'assigned':
        return projectTasks.filter((t) => {
          const assigneeId =
            typeof t.assignee === 'string'
              ? t.assignee
              : t.assignee?._id;
          return assigneeId === currentUser?._id;
        });
      case 'overdue': {
        const today = dayjs().startOf('day');
        return projectTasks.filter((t) => {
          const assigneeId =
            typeof t.assignee === 'string'
              ? t.assignee
              : t.assignee?._id;
          if (assigneeId !== currentUser?._id) return false;
          if (!t.dueDate) return false;
          const due = dayjs(t.dueDate);
          return (
            due.startOf('day').isBefore(today) &&
            t.status !== STATUS_META.closed.key
          );
        });
      }
      default:
        return projectTasks;
    }
  }, [projectTasks, userSection, currentProject, currentUser]);

  const userAssignedAllTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter((t) => {
      const assigneeId =
        typeof t.assignee === 'string'
          ? t.assignee
          : t.assignee?._id;
      return assigneeId === currentUser._id;
    });
  }, [tasks, currentUser]);

  const userCompletedTasks = useMemo(
    () =>
      userAssignedAllTasks.filter(
        (t) =>
          t.status === STATUS_META.done.key ||
          t.status === STATUS_META.closed.key
      ),
    [userAssignedAllTasks]
  );

  const userOnTimeTasks = useMemo(
    () =>
      userCompletedTasks.filter((t) => {
        if (!t.dueDate || !t.completedAt) return false;
        const due = dayjs(t.dueDate).endOf('day');
        const completed = dayjs(t.completedAt);
        return completed.isSameOrBefore(due);
      }),
    [userCompletedTasks]
  );

  const userOverdueAssignedOpen = useMemo(() => {
    const today = dayjs().startOf('day');
    return userAssignedAllTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = dayjs(t.dueDate).startOf('day');
      return (
        due.isBefore(today) &&
        t.status !== STATUS_META.closed.key
      );
    });
  }, [userAssignedAllTasks]);

  const userEfficiency = useMemo(() => {
    if (!currentUser) return null;
    const totalAssigned = userAssignedAllTasks.length;
    const completed = userCompletedTasks.length;
    const onTime = userOnTimeTasks.length;
    const overdueOpen = userOverdueAssignedOpen.length;

    if (!totalAssigned) {
      return {
        totalAssigned,
        completed,
        onTime,
        overdueOpen,
        score: null,
        level: 'Недостаточно данных',
        status: 'normal',
      };
    }

    const completionRate = completed / totalAssigned;
    const onTimeRate = completed ? onTime / completed : 0;
    const overdueRate = overdueOpen / totalAssigned;

    let rawScore =
      60 * completionRate + 40 * onTimeRate - 20 * overdueRate;
    if (rawScore < 0) rawScore = 0;
    if (rawScore > 100) rawScore = 100;

    let level;
    let status;
    if (rawScore >= 80) {
      level = 'Отличный результат';
      status = 'success';
    } else if (rawScore >= 50) {
      level = 'Хороший уровень';
      status = 'normal';
    } else {
      level = 'Нужно подтянуть задачи';
      status = 'exception';
    }

    return {
      totalAssigned,
      completed,
      onTime,
      overdueOpen,
      score: Math.round(rawScore),
      level,
      status,
    };
  }, [
    currentUser,
    userAssignedAllTasks,
    userCompletedTasks,
    userOnTimeTasks,
    userOverdueAssignedOpen,
  ]);

  const projectCategories = useMemo(
    () =>
      currentProject
        ? categories.filter((c) => c.projectId === currentProject._id)
        : [],
    [categories, currentProject]
  );

  const projectUsers = useMemo(() => {
    if (!currentProject) return [];
    const ids = new Set(currentProject.memberIds || []);
    ids.add(currentProject.ownerId);
    return users.filter((u) => ids.has(u._id));
  }, [users, currentProject]);

  const tasksNeedingConfirmation = useMemo(() => {
    if (!currentUser || !currentProject) return 0;
    return tasks.filter(
      (t) =>
        t.projectId === currentProject._id &&
        t.creatorId === currentUser._id &&
        t.awaitingConfirmation
    ).length;
  }, [tasks, currentUser, currentProject]);

  const handleEditTask = (task) => {
    if (!currentUser || !task) return;
    if (task.creatorId !== currentUser._id) {
      message.error('Редактировать задачу может только её создатель');
      return;
    }
    setTaskFormMode('edit');
    setTaskToEdit(task);
    setTaskModalOpen(true);
  };

  const handleMarkTaskDone = (task) => {
    if (!currentUser || !task) return;
    const assigneeId =
      typeof task.assignee === 'string'
        ? task.assignee
        : task.assignee?._id;
    if (assigneeId !== currentUser._id) {
      message.error('Отметить выполнение может только исполнитель задачи');
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status: STATUS_META.done.key,
              awaitingConfirmation: true,
            }
          : t
      )
    );
    setSelectedTask((prev) =>
      prev && prev._id === task._id
        ? {
            ...prev,
            status: STATUS_META.done.key,
            awaitingConfirmation: true,
          }
        : prev
    );
  };

  const handleConfirmCompletion = (task) => {
    if (!currentUser || !task) return;
    if (task.creatorId !== currentUser._id) {
      message.error('Подтвердить выполнение может только инициатор задачи');
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status: STATUS_META.closed.key,
              awaitingConfirmation: false,
            }
          : t
      )
    );
    setSelectedTask((prev) =>
      prev && prev._id === task._id
        ? {
            ...prev,
            status: STATUS_META.closed.key,
            awaitingConfirmation: false,
          }
        : prev
    );
  };

  const handleRequestRework = (task) => {
    if (!currentUser || !task) return;
    if (task.creatorId !== currentUser._id) {
      message.error('Отправить на доработку может только инициатор задачи');
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status: STATUS_META.in_progress.key,
              awaitingConfirmation: false,
            }
          : t
      )
    );
    setSelectedTask((prev) =>
      prev && prev._id === task._id
        ? {
            ...prev,
            status: STATUS_META.in_progress.key,
            awaitingConfirmation: false,
          }
        : prev
    );
  };

  // --- экраны без текущего пользователя ---
  if (screen === 'landing' && !currentUser) {
    return (
      <LandingPage
        onLoginClick={() => {
          setAuthError(null);
          setRegisterError(null);
          setScreen('login');
        }}
        onRegisterClick={() => {
          setAuthError(null);
          setRegisterError(null);
          registerRegisterClick();
          setScreen('register');
        }}
      />
    );
  }

  if (screen === 'login' && !currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        error={authError}
        onBackHome={() => {
          setAuthError(null);
          setRegisterError(null);
          registerLandingVisit();
          setScreen('landing');
        }}
        onGoRegister={() => {
          setAuthError(null);
          setRegisterError(null);
          setScreen('register');
        }}
      />
    );
  }

  if (screen === 'register' && !currentUser) {
    return (
      <RegisterPage
        onRegister={handleRegister}
        error={registerError}
        onBackToLogin={() => {
          setAuthError(null);
          setRegisterError(null);
          setScreen('login');
        }}
        onBackHome={() => {
          setAuthError(null);
          setRegisterError(null);
          registerLandingVisit();
          setScreen('landing');
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <LandingPage
        onLoginClick={() => setScreen('login')}
        onRegisterClick={() => {
          registerRegisterClick();
          setScreen('register');
        }}
      />
    );
  }

  return (
    <MainLayout currentUser={currentUser} onLogout={handleLogout}>
      {isAdminMode && currentUser.isAdmin ? (
        <AdminDashboard
          users={users}
          projects={projects}
          tasks={tasks}
          landingStats={landingStats}
          adminSection={adminSection}
          onSectionChange={setAdminSection}
          onOpenTask={handleOpenTaskDetails}
          onCreateUser={handleAdminCreateUser}
        />
      ) : (
        <>
          <div className="app-toolbar">
            <div className="app-toolbar-title">
              <Title level={3} style={{ marginBottom: 0 }}>
                Задачи проектов
              </Title>
            </div>
            <div className="app-toolbar-actions">
              <Space size={8} wrap>
                <Segmented
                  options={[
                    { label: 'Список', value: 'list' },
                    { label: 'Доска', value: 'board' },
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                />
                <Select
                  value={currentProject ? currentProject._id : undefined}
                  placeholder={
                    activeProjects.length
                      ? 'Выберите проект'
                      : 'Нет активных проектов'
                  }
                  style={{ minWidth: 200 }}
                  onChange={handleProjectChange}
                  options={activeProjects.map((p) => ({
                    label: p.name,
                    value: p._id,
                  }))}
                />
                <Button onClick={handleOpenProjectModal}>
                  Создать проект
                </Button>
                <Button
                  onClick={() => setProjectsDrawerOpen(true)}
                  disabled={!accessibleProjects.length}
                >
                  Мои проекты
                </Button>
                <Button
                  onClick={() => setProjectMembersDrawerOpen(true)}
                  disabled={!currentProject}
                >
                  Управление проектом
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setTaskFormMode('create');
                    setTaskToEdit(null);
                    setTaskModalOpen(true);
                  }}
                  disabled={!currentProject}
                >
                  Создать задачу
                </Button>
                <Button
                  onClick={() => setCategoryModalOpen(true)}
                  disabled={!currentProject}
                >
                  Новая категория
                </Button>
              </Space>
              <Space size={8} wrap>
                {currentProject && tasksNeedingConfirmation > 0 && (
                  <Tag color="processing">
                    Нужно подтвердить: {tasksNeedingConfirmation}
                  </Tag>
                )}
                {currentUser.isAdmin && (
                  <Button
                    size="small"
                    onClick={() => setIsAdminMode((prev) => !prev)}
                  >
                    {isAdminMode ? 'Дашборд проектов' : 'Админ-панель'}
                  </Button>
                )}
              </Space>
            </div>
          </div>

          <div className="app-main">
            <div className="app-main-sidebar">
              <UserSidebar
                currentSection={userSection}
                onChangeSection={setUserSection}
                counts={{
                  mine: myTasksCount,
                  assigned: assignedTasksCount,
                  overdue: overdueTasksCount,
                }}
                efficiencyCount={
                  userEfficiency && userEfficiency.score != null
                    ? userEfficiency.score
                    : 0
                }
              />
            </div>
            <div className="app-main-content">
              {userSection === 'efficiency' ? (
                <UserEfficiency metrics={userEfficiency} />
              ) : !currentProject ? (
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">
                    Нет выбранного проекта. Создайте новый проект или попросите администратора добавить вас в существующий.
                  </Text>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Текущий проект:</Text>{' '}
                    <Text>
                      {currentProject.name}{' '}
                      {isCurrentUserProjectOwner && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          Владелец проекта
                        </Tag>
                      )}
                    </Text>
                    {currentProject.description && (
                      <div>
                        <Text type="secondary">
                          {currentProject.description}
                        </Text>
                      </div>
                    )}
                  </div>

                  {viewMode === 'list' ? (
                    <TaskList
                      tasks={filteredProjectTasks}
                      onTaskClick={handleOpenTaskDetails}
                    />
                  ) : (
                    <ProjectBoard
                      tasks={filteredProjectTasks}
                      categories={projectCategories}
                      projectUsers={projectUsers}
                      onTaskStatusChange={handleTaskStatusChange}
                      onTaskClick={handleOpenTaskDetails}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <TaskForm
        open={isTaskModalOpen}
        loading={taskFormLoading}
        mode={taskFormMode}
        initialTask={taskToEdit}
        projectUsers={projectUsers}
        categories={projectCategories}
        onCancel={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
          setTaskFormMode('create');
        }}
        onSubmit={handleTaskSubmit}
      />

      <CategoryForm
        open={isCategoryModalOpen}
        loading={categoryFormLoading}
        onCancel={() => setCategoryModalOpen(false)}
        onSubmit={handleCreateCategory}
      />

      <TaskDetailsModal
        open={!!selectedTask}
        task={selectedTask}
        currentUser={currentUser}
        users={users}
        onClose={handleCloseTaskDetails}
        onEdit={handleEditTask}
        onMarkDone={handleMarkTaskDone}
        onConfirmCompletion={handleConfirmCompletion}
        onRequestRework={handleRequestRework}
      />

            <Drawer
        title={
          currentProject
            ? `Участники проекта: ${currentProject.name}`
            : 'Участники проекта'
        }
        placement="right"
        width={400}
        open={isProjectMembersDrawerOpen}
        onClose={() => setProjectMembersDrawerOpen(false)}
        destroyOnClose
      >
        {currentProject && (
          <ProjectMembers
            project={currentProject}
            users={users}
            currentUser={currentUser}
            canManageMembers={!!isCurrentUserProjectOwner}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onRevokeInvite={handleRevokeInvite}
          />
        )}
      </Drawer>

      <Drawer
        title="Мои проекты"
        placement="left"
        width={420}
        open={isProjectsDrawerOpen}
        onClose={() => setProjectsDrawerOpen(false)}
        destroyOnClose
      >
        <ProjectList
          projects={accessibleProjects}
          currentUser={currentUser}
          currentProjectId={currentProject ? currentProject._id : null}
          onSelectProject={(projectId) => {
            setCurrentProjectId(projectId);
            setProjectsDrawerOpen(false);
          }}
          onChangeStatus={handleChangeProjectStatus}
        />
      </Drawer>

{isProjectModalOpen && (
        <div className="app-project-modal-backdrop">
          <div className="app-project-modal">
            <Title level={4}>Новый проект</Title>
            <div className="app-project-modal-body">
              <label className="app-project-modal-label">
                Название проекта
              </label>
              <input
                className="app-project-modal-input"
                value={projectFormName}
                onChange={(e) => setProjectFormName(e.target.value)}
                placeholder="Например: CRM система"
              />
              <label className="app-project-modal-label">
                Описание (необязательно)
              </label>
              <textarea
                className="app-project-modal-textarea"
                value={projectFormDescription}
                onChange={(e) =>
                  setProjectFormDescription(e.target.value)
                }
                placeholder="Краткое описание проекта"
              />
            </div>
            <div className="app-project-modal-actions">
              <Button onClick={() => setProjectModalOpen(false)}>
                Отмена
              </Button>
              <Button
                type="primary"
                onClick={handleCreateProject}
                disabled={!projectFormName.trim()}
              >
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default App;
