import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  TeamOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { Avatar, Button, Card, ColorPicker, Empty, Form, Input, Modal, Popconfirm, Select, Space, Tag, Tooltip, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./Projects.css";

function userId(user) {
  return user?._id || user;
}

function displayName(user) {
  return user?.name || user?.email || "Пользователь";
}

function initials(user) {
  const source = displayName(user).trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function categoryKey(category) {
  return category?._id || category?.id || category?.name;
}

function pluralizeRu(count, forms) {
  const normalizedCount = Math.abs(count) % 100;
  const lastDigit = normalizedCount % 10;

  if (normalizedCount > 10 && normalizedCount < 20) {
    return forms[2];
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return forms[1];
  }

  if (lastDigit === 1) {
    return forms[0];
  }

  return forms[2];
}

const emailStatusLabels = {
  pending: ["Ожидает отправки", "default"],
  sent: ["Письмо отправлено", "green"],
  skipped: ["SMTP не настроен", "gold"],
  failed: ["Ошибка отправки", "red"]
};

export function Projects({ user }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [projectForm] = Form.useForm();
  const [editProjectForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const activeProject = useMemo(
    () => projects.find((project) => project._id === projectId),
    [projects, projectId]
  );
  const pendingInvitations = useMemo(
    () => activeProject?.invitations?.filter((invitation) => invitation.status === "pending") || [],
    [activeProject]
  );
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [project.name, project.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [projects, projectSearch]);

  const currentMember = activeProject?.members.find((member) => userId(member.user) === user?._id);
  const isAdmin = currentMember?.role === "admin";

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/projects");
      setProjects(data.projects);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function createProject(values) {
    try {
      const data = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setProjectModalOpen(false);
      projectForm.resetFields();
      await loadProjects();
      navigate(`/app/projects/${data.project._id}`);
      message.success("Проект создан");
    } catch (error) {
      message.error(error.message);
    }
  }

  function openEditProject() {
    editProjectForm.setFieldsValue({
      name: activeProject.name,
      description: activeProject.description
    });
    setEditProjectModalOpen(true);
  }

  async function editProject(values) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}`, {
        method: "PATCH",
        body: JSON.stringify(values)
      });
      updateProject(data.project);
      setEditProjectModalOpen(false);
      message.success("Проект обновлён");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function addMember(values) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}/members`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      updateProject(data.project);
      memberForm.resetFields();
      const exists = data.project.members.some((member) => member.user?.email === values.email.toLowerCase());
      const invitation = data.project.invitations?.find(
        (item) => item.email === values.email.toLowerCase() && item.status === "pending"
      );

      if (exists) {
        message.success("Участник обновлён");
      } else if (invitation?.emailStatus === "sent") {
        message.success("Приглашение отправлено на email");
      } else if (invitation?.emailStatus === "skipped") {
        message.warning("Приглашение создано, но SMTP пока не настроен");
      } else {
        message.warning("Приглашение создано, но письмо не отправилось");
      }
    } catch (error) {
      message.error(error.message);
    }
  }

  async function resendInvitation(invitationId) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}/invitations/${invitationId}/resend`, {
        method: "POST"
      });
      updateProject(data.project);
      const invitation = data.project.invitations.find((item) => item._id === invitationId);

      if (invitation?.emailStatus === "sent") {
        message.success("Приглашение отправлено повторно");
      } else if (invitation?.emailStatus === "skipped") {
        message.warning("SMTP пока не настроен, письмо не отправлено");
      } else {
        message.error(invitation?.emailError || "Не удалось отправить приглашение");
      }
    } catch (error) {
      message.error(error.message);
    }
  }

  async function copyInvitationLink(invitation) {
    if (!invitation.token) {
      message.warning("Сначала отправьте приглашение повторно, чтобы обновить ссылку");
      return;
    }

    const url = `${window.location.origin}/register?invite=${invitation.token}`;

    try {
      await navigator.clipboard.writeText(url);
      message.success("Ссылка приглашения скопирована");
    } catch (error) {
      message.error("Не удалось скопировать ссылку");
    }
  }

  async function removeMember(memberUserId) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}/members/${memberUserId}`, {
        method: "DELETE"
      });
      updateProject(data.project);
      message.success("Участник удалён");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function removeInvitation(invitationId) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}/invitations/${invitationId}`, {
        method: "DELETE"
      });
      updateProject(data.project);
      message.success("Приглашение удалено");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function addCategory(values) {
    try {
      const color = typeof values.color === "string" ? values.color : values.color?.toHexString();
      const data = await apiFetch(`/projects/${activeProject._id}/categories`, {
        method: "POST",
        body: JSON.stringify({ ...values, color })
      });
      updateProject({ ...activeProject, categories: data.categories });
      categoryForm.resetFields();
      message.success("Категория создана");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function removeCategory(categoryId) {
    try {
      const data = await apiFetch(`/projects/${activeProject._id}/categories/${encodeURIComponent(categoryId)}`, {
        method: "DELETE"
      });
      updateProject({ ...activeProject, categories: data.categories });
      message.success("Категория удалена");
    } catch (error) {
      message.error(error.message);
    }
  }

  function updateProject(project) {
    setProjects((items) => items.map((item) => (item._id === project._id ? project : item)));
  }

  function renderProjectCard(project) {
    const projectMember = project.members.find((member) => userId(member.user) === user?._id);
    const memberCount = project.members.length;
    const categoryCount = project.categories.length;

    return (
      <button
        key={project._id}
        type="button"
        className="projects__project-card"
        onClick={() => navigate(`/app/projects/${project._id}`)}
      >
        <span className="projects__project-card-top">
          <span className="projects__project-icon" aria-hidden="true">
            <FolderOpenOutlined />
          </span>
          <Tag color={projectMember?.role === "admin" ? "green" : "blue"}>
            {projectMember?.role === "admin" ? "Администратор" : "Участник"}
          </Tag>
        </span>
        <span className="projects__project-name">{project.name}</span>
        <span className="projects__project-description">{project.description || "Описание пока не добавлено"}</span>
        <span className="projects__project-meta">
          <span>
            <TeamOutlined />
            {memberCount} {pluralizeRu(memberCount, ["участник", "участника", "участников"])}
          </span>
          <span>{categoryCount} {pluralizeRu(categoryCount, ["категория", "категории", "категорий"])}</span>
        </span>
      </button>
    );
  }

  function renderProjectsList() {
    return (
      <>
        <Card className="projects__catalog" loading={loading}>
          <div className="projects__catalog-toolbar">
            <div>
              <Typography.Title level={2}>Все проекты</Typography.Title>
              <Typography.Text type="secondary">
                {projects.length ? `${filteredProjects.length} из ${projects.length} проект(ов)` : "Создайте первый проект"}
              </Typography.Text>
            </div>
            {projects.length > 0 && (
              <Input.Search
                allowClear
                className="projects__search"
                placeholder="Поиск по проектам"
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
              />
            )}
          </div>
          {filteredProjects.length ? (
            <div className="projects__project-list" role="list" aria-label="Проекты">
              {filteredProjects.map(renderProjectCard)}
            </div>
          ) : projectSearch ? (
            <Empty description="Проекты не найдены" />
          ) : (
            <Empty description="Создайте первый проект" />
          )}
        </Card>
      </>
    );
  }

  function renderProjectSettings() {
    if (loading) {
      return <Card loading />;
    }

    if (!activeProject) {
      return (
        <Card>
          <Empty
            description="Проект не найден или у вас нет доступа"
          >
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/app/projects")}>
              Все проекты
            </Button>
          </Empty>
        </Card>
      );
    }

    return (
      <div className="projects__workspace">
        <Card className="projects__summary">
                <div className="projects__summary-main">
                  <div className="projects__summary-title">
                    <span className="projects__summary-icon" aria-hidden="true">
                      <FolderOpenOutlined />
                    </span>
                    <div>
                      <Typography.Title level={2}>{activeProject.name}</Typography.Title>
                      <Typography.Paragraph>{activeProject.description || "Описание проекта пока не добавлено"}</Typography.Paragraph>
                    </div>
                  </div>
                  <div className="projects__summary-metrics" aria-label="Показатели проекта">
                    <div>
                      <strong>{activeProject.members.length}</strong>
                      <span>участников</span>
                    </div>
                    <div>
                      <strong>{pendingInvitations.length}</strong>
                      <span>приглашений</span>
                    </div>
                    <div>
                      <strong>{activeProject.categories.length}</strong>
                      <span>категорий</span>
                    </div>
                  </div>
                </div>
                <Space wrap className="projects__summary-actions">
                  <Tag color={isAdmin ? "green" : "blue"}>{isAdmin ? "Администратор" : "Участник"}</Tag>
                  {isAdmin && (
                    <Button icon={<EditOutlined />} onClick={openEditProject}>
                      Редактировать
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate(`/app/projects/${activeProject._id}/tasks`)}
                  >
                    Открыть задачи
                  </Button>
                </Space>
        </Card>

        <Card className="projects__panel" title="Участники и приглашения">
          {isAdmin && (
            <div className="projects__panel-section">
              <div className="projects__section-head">
                <Typography.Text strong>Пригласить участника</Typography.Text>
              </div>
              <Form form={memberForm} layout="vertical" onFinish={addMember} className="projects__invite-form">
                <Form.Item
                  name="email"
                  label="Email участника"
                  rules={[{ required: true, message: "Email обязателен" }, { type: "email", message: "Введите корректный email" }]}
                >
                  <Input placeholder="name@company.ru" />
                </Form.Item>
                <Form.Item name="role" label="Роль" initialValue="member">
                  <Select
                    options={[
                      { value: "member", label: "Участник" },
                      { value: "admin", label: "Администратор" }
                    ]}
                  />
                </Form.Item>
                <Button type="primary" icon={<UserAddOutlined />} htmlType="submit">
                  Пригласить
                </Button>
              </Form>
            </div>
          )}
          <div className="projects__panel-section">
            <div className="projects__section-head">
              <Typography.Text strong>Участники</Typography.Text>
              <Tag>{activeProject.members.length}</Tag>
            </div>
            <div className="projects__people-list">
              {activeProject.members.map((member) => (
                <div className="projects__person-row" key={userId(member.user)}>
                  <Avatar className="projects__avatar">{initials(member.user)}</Avatar>
                  <div className="projects__person-main">
                    <Typography.Text strong>{displayName(member.user)}</Typography.Text>
                    <Typography.Text type="secondary">{member.user?.email || "Email не указан"}</Typography.Text>
                  </div>
                  <div className="projects__person-tags">
                    <Tag>{member.role === "admin" ? "Админ" : "Участник"}</Tag>
                  </div>
                  {isAdmin && (
                    <Popconfirm
                      title="Удалить участника?"
                      description="Участник потеряет доступ к проекту."
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={() => removeMember(userId(member.user))}
                    >
                      <Tooltip title="Удалить участника">
                        <Button
                          aria-label={`Удалить участника ${displayName(member.user)}`}
                          icon={<DeleteOutlined />}
                          danger
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </div>
              ))}
            </div>
          </div>

          {pendingInvitations.length > 0 && (
            <div className="projects__pending projects__panel-section">
              <div className="projects__section-head">
                <Typography.Text strong>Ожидают регистрации</Typography.Text>
                <Tag>{pendingInvitations.length}</Tag>
              </div>
              <div className="projects__people-list projects__people-list--pending">
                {pendingInvitations.map((invitation) => (
                  <div className="projects__person-row projects__person-row--pending" key={invitation._id}>
                    <Avatar className="projects__avatar projects__avatar--pending">
                      <UserAddOutlined />
                    </Avatar>
                    <div className="projects__person-main">
                      <Typography.Text strong>{invitation.email}</Typography.Text>
                      <Typography.Text type="secondary">
                        Будет добавлен после регистрации с этим email
                      </Typography.Text>
                      {invitation.emailError && (
                        <Typography.Text type="danger">{invitation.emailError}</Typography.Text>
                      )}
                    </div>
                    <div className="projects__person-tags">
                      <Tag color={emailStatusLabels[invitation.emailStatus]?.[1] || "default"}>
                        {emailStatusLabels[invitation.emailStatus]?.[0] || "Email"}
                      </Tag>
                      <Tag>{invitation.role === "admin" ? "Админ" : "Участник"}</Tag>
                    </div>
                    {isAdmin && (
                      <Space size={6} className="projects__row-actions">
                        <Tooltip title="Отправить повторно">
                          <Button
                            aria-label={`Отправить приглашение повторно ${invitation.email}`}
                            icon={<SendOutlined />}
                            onClick={() => resendInvitation(invitation._id)}
                          />
                        </Tooltip>
                        <Tooltip title="Скопировать ссылку">
                          <Button
                            aria-label={`Скопировать ссылку приглашения ${invitation.email}`}
                            icon={<CopyOutlined />}
                            onClick={() => copyInvitationLink(invitation)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Удалить приглашение?"
                          description="Ссылка приглашения перестанет работать."
                          okText="Удалить"
                          cancelText="Отмена"
                          onConfirm={() => removeInvitation(invitation._id)}
                        >
                          <Tooltip title="Удалить приглашение">
                            <Button
                              aria-label={`Удалить приглашение ${invitation.email}`}
                              icon={<DeleteOutlined />}
                              danger
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="projects__panel" title="Категории задач">
          {isAdmin && (
            <div className="projects__panel-section">
              <div className="projects__section-head">
                <Typography.Text strong>Создать категорию</Typography.Text>
              </div>
              <Form form={categoryForm} layout="vertical" onFinish={addCategory} className="projects__category-form">
                <Form.Item name="name" label="Название категории" rules={[{ required: true, message: "Название обязательно" }]}>
                  <Input placeholder="Например: Срочно" />
                </Form.Item>
                <Form.Item name="color" label="Цвет" initialValue="#2563eb">
                  <ColorPicker />
                </Form.Item>
                <Button type="primary" icon={<PlusOutlined />} htmlType="submit">
                  Добавить
                </Button>
              </Form>
            </div>
          )}
          <div className="projects__panel-section">
            <div className="projects__section-head">
              <Typography.Text strong>Список категорий</Typography.Text>
              <Tag>{activeProject.categories.length}</Tag>
            </div>
            {activeProject.categories.length ? (
              <div className="projects__category-list">
                {activeProject.categories.map((category) => (
                  <Tag
                    key={categoryKey(category)}
                    color={category.color}
                    closable={isAdmin}
                    onClose={(event) => {
                      event.preventDefault();
                      const removableCategoryKey = categoryKey(category);
                      if (!removableCategoryKey) {
                        message.error("Не удалось определить категорию для удаления");
                        return;
                      }

                      Modal.confirm({
                        title: "Удалить категорию?",
                        content: `Категория «${category.name}» будет удалена из проекта.`,
                        okText: "Удалить",
                        cancelText: "Отмена",
                        okButtonProps: { danger: true },
                        onOk: () => removeCategory(removableCategoryKey)
                      });
                    }}
                  >
                    {category.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Категории пока не созданы" />
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <section className="projects">
      <div className="projects__head">
        <div>
          {projectId && (
            <Button
              className="projects__back"
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/app/projects")}
            >
              Все проекты
            </Button>
          )}
          <Typography.Title level={1}>{projectId ? "Параметры проекта" : "Проекты"}</Typography.Title>
          <Typography.Paragraph>
            {projectId
              ? "Участники, приглашения, категории и настройки проекта."
              : "Все рабочие пространства, роли и участники."}
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Tooltip title="Обновить проекты">
            <Button
              aria-label="Обновить проекты"
              icon={<ReloadOutlined />}
              onClick={() => loadProjects()}
              loading={loading}
            />
          </Tooltip>
          {!projectId && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalOpen(true)}>
              Проект
            </Button>
          )}
        </Space>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={() => loadProjects()}
        />
      )}

      {projectId ? renderProjectSettings() : renderProjectsList()}

      <Modal
        title="Новый проект"
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={() => projectForm.submit()}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={projectForm} layout="vertical" onFinish={createProject}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Редактировать проект"
        open={editProjectModalOpen}
        onCancel={() => setEditProjectModalOpen(false)}
        onOk={() => editProjectForm.submit()}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={editProjectForm} layout="vertical" onFinish={editProject}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
