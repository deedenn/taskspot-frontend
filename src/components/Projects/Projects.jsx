import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { Button, Card, ColorPicker, Empty, Form, Input, List, Modal, Popconfirm, Select, Space, Tag, Tooltip, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./Projects.css";

function userId(user) {
  return user?._id || user;
}

const emailStatusLabels = {
  pending: ["Ожидает отправки", "default"],
  sent: ["Письмо отправлено", "green"],
  skipped: ["SMTP не настроен", "gold"],
  failed: ["Ошибка отправки", "red"]
};

export function Projects({ user }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [projectForm] = Form.useForm();
  const [editProjectForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId),
    [projects, activeProjectId]
  );

  const currentMember = activeProject?.members.find((member) => userId(member.user) === user?._id);
  const isAdmin = currentMember?.role === "admin";

  async function loadProjects(preferredId) {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/projects");
      setProjects(data.projects);
      setActiveProjectId((currentId) => preferredId || currentId || data.projects[0]?._id || null);
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
      await loadProjects(data.project._id);
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
      const exists = data.project.members.some((member) => member.user.email === values.email.toLowerCase());
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
      const data = await apiFetch(`/projects/${activeProject._id}/categories/${categoryId}`, {
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

  function handleProjectKeyDown(event, projectId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActiveProjectId(projectId);
    }
  }

  return (
    <section className="projects">
      <div className="projects__head">
        <div>
          <Typography.Title level={1}>Проекты</Typography.Title>
          <Typography.Paragraph>Управление рабочими пространствами, участниками и категориями.</Typography.Paragraph>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalOpen(true)}>
            Проект
          </Button>
        </Space>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={() => loadProjects(activeProjectId)}
        />
      )}

      <div className="projects__grid">
        <Card className="projects__list" loading={loading}>
          {projects.length ? (
	            <List
	              role="listbox"
	              aria-label="Проекты"
	              dataSource={projects}
              renderItem={(project) => (
	                <List.Item
	                  className={project._id === activeProjectId ? "projects__item projects__item--active" : "projects__item"}
	                  role="option"
	                  tabIndex={0}
	                  aria-selected={project._id === activeProjectId}
	                  onClick={() => setActiveProjectId(project._id)}
	                  onKeyDown={(event) => handleProjectKeyDown(event, project._id)}
	                >
                  <List.Item.Meta
                    title={project.name}
                    description={`${project.members.length} участник(ов)`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="Создайте первый проект" />
          )}
        </Card>

        <div className="projects__workspace">
          {activeProject ? (
            <>
              <Card className="projects__summary">
                <div>
                  <Typography.Title level={2}>{activeProject.name}</Typography.Title>
                  <Typography.Paragraph>{activeProject.description || "Без описания"}</Typography.Paragraph>
                </div>
                <Space wrap className="projects__summary-actions">
                  <Tag color={isAdmin ? "green" : "blue"}>{isAdmin ? "Администратор" : "Участник"}</Tag>
                  {isAdmin && (
                    <Button icon={<EditOutlined />} onClick={openEditProject}>
                      Редактировать
                    </Button>
                  )}
	                  <Button
	                    icon={<FolderOpenOutlined />}
	                    onClick={() => navigate(`/app/projects/${activeProject._id}/tasks`)}
	                  >
	                    Открыть задачи
	                  </Button>
                </Space>
              </Card>

              <div className="projects__admin-grid">
                <Card title="Участники">
                  {isAdmin && (
                    <Form form={memberForm} layout="vertical" onFinish={addMember} className="projects__inline-form">
                      <Form.Item name="email" rules={[{ required: true, message: "Email обязателен" }]}>
                        <Input placeholder="email участника" />
                      </Form.Item>
                      <Form.Item name="role" initialValue="member">
                        <Select
                          options={[
                            { value: "member", label: "Участник" },
                            { value: "admin", label: "Администратор" }
                          ]}
                        />
                      </Form.Item>
                      <Button type="primary" icon={<UserAddOutlined />} htmlType="submit" />
                    </Form>
                  )}
                  <List
                    dataSource={activeProject.members}
                    renderItem={(member) => (
                      <List.Item
                        actions={
                          isAdmin
                            ? [
	                                <Popconfirm
	                                  key="remove"
	                                  title="Удалить участника?"
	                                  description="Участник потеряет доступ к проекту."
	                                  okText="Удалить"
	                                  cancelText="Отмена"
	                                  onConfirm={() => removeMember(userId(member.user))}
	                                >
	                                  <Tooltip title="Удалить участника">
	                                    <Button
	                                      aria-label={`Удалить участника ${member.user.name}`}
	                                      icon={<DeleteOutlined />}
	                                      danger
	                                    />
	                                  </Tooltip>
	                                </Popconfirm>
	                              ]
                            : []
                        }
                      >
                        <List.Item.Meta
                          title={member.user.name}
                          description={member.user.email}
                        />
                        <Tag>{member.role === "admin" ? "Админ" : "Участник"}</Tag>
                      </List.Item>
                    )}
                  />
                  {activeProject.invitations?.some((invitation) => invitation.status === "pending") && (
                    <div className="projects__pending">
                      <Typography.Text strong>Ожидают регистрации</Typography.Text>
                      <List
                        dataSource={activeProject.invitations.filter(
                          (invitation) => invitation.status === "pending"
                        )}
                        renderItem={(invitation) => (
                          <List.Item
                            actions={
                              isAdmin
                                ? [
	                                    <Tooltip key="resend" title="Отправить повторно">
	                                      <Button
	                                        aria-label={`Отправить приглашение повторно ${invitation.email}`}
	                                        icon={<SendOutlined />}
	                                        onClick={() => resendInvitation(invitation._id)}
	                                      />
	                                    </Tooltip>,
	                                    <Tooltip key="copy" title="Скопировать ссылку">
	                                      <Button
	                                        aria-label={`Скопировать ссылку приглашения ${invitation.email}`}
	                                        icon={<CopyOutlined />}
	                                        onClick={() => copyInvitationLink(invitation)}
	                                      />
	                                    </Tooltip>,
	                                    <Popconfirm
	                                      key="remove"
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
	                                  ]
                                : []
                            }
                          >
                            <List.Item.Meta
                              title={invitation.email}
                              description={
                                <Space direction="vertical" size={2}>
                                  <span>Пользователь будет добавлен после регистрации с этим email</span>
                                  {invitation.emailError && (
                                    <Typography.Text type="danger">{invitation.emailError}</Typography.Text>
                                  )}
                                </Space>
                              }
                            />
                            <Tag color={emailStatusLabels[invitation.emailStatus]?.[1] || "default"}>
                              {emailStatusLabels[invitation.emailStatus]?.[0] || "Email"}
                            </Tag>
                            <Tag>{invitation.role === "admin" ? "Админ" : "Участник"}</Tag>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </Card>

                <Card title="Категории">
                  {isAdmin && (
                    <Form form={categoryForm} layout="vertical" onFinish={addCategory} className="projects__inline-form">
                      <Form.Item name="name" rules={[{ required: true, message: "Название обязательно" }]}>
                        <Input placeholder="Название" />
                      </Form.Item>
                      <Form.Item name="color" initialValue="#1f7a8c">
                        <ColorPicker />
                      </Form.Item>
                      <Button type="primary" icon={<PlusOutlined />} htmlType="submit" />
                    </Form>
                  )}
                  <Space wrap>
                    {activeProject.categories.map((category) => (
                      <Tag
                        key={category._id}
                        color={category.color}
	                        closable={isAdmin}
	                        onClose={(event) => {
	                          event.preventDefault();
	                          Modal.confirm({
	                            title: "Удалить категорию?",
	                            content: `Категория «${category.name}» будет удалена из проекта.`,
	                            okText: "Удалить",
	                            cancelText: "Отмена",
	                            okButtonProps: { danger: true },
	                            onOk: () => removeCategory(category._id)
	                          });
	                        }}
                      >
                        {category.name}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <Empty description="Выберите или создайте проект" />
            </Card>
          )}
        </div>
      </div>

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
