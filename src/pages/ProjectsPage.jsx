import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  List,
  Tag,
  Space,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  MailOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  fetchProjectsApi,
  createProjectApi,
  fetchProjectMembersApi,
  addProjectMemberApi,
  removeProjectMemberApi,
} from '../api/projects';

const { Title, Text } = Typography;

export default function ProjectsPage({ currentUser, projects, setProjects, currentProject }) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [createForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    // если проектов нет (или только что зашли на страницу) — обновим список с сервера
    async function reload() {
      try {
        const list = await fetchProjectsApi();
        setProjects(list);
      } catch (e) {
        console.error(e);
      }
    }
    if (!projects || projects.length === 0) {
      reload();
    }
  }, [projects, setProjects]);

  const openCreate = () => {
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  const handleCreateProject = async () => {
    try {
      const values = await createForm.validateFields();
      const created = await createProjectApi(values);
      setProjects((prev) => [...prev, created]);
      message.success('Проект создан');
      setCreateModalOpen(false);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось создать проект');
    }
  };

  const openMembers = async (project) => {
    setSelectedProject(project);
    setMembers([]);
    setMemberModalOpen(true);
    setLoadingMembers(true);
    try {
      const data = await fetchProjectMembersApi(project._id);
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProject) return;
    try {
      const values = await memberForm.validateFields();
      const resp = await addProjectMemberApi(selectedProject._id, values.email);
      message.success(resp.message || 'Приглашение отправлено');
      memberForm.resetFields();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось добавить участника');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedProject) return;
    try {
      await removeProjectMemberApi(selectedProject._id, userId);
      setMembers((prev) => prev.filter((m) => m._id !== userId));
      message.success('Участник удалён');
    } catch (e) {
      message.error(e.message || 'Не удалось удалить участника');
    }
  };

  return (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={12}>
          <Title level={4} style={{ margin: 0 }}>
            Мои проекты
          </Title>
        </Col>
        <Col xs={24} md={12} style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            Новый проект
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        {projects && projects.length > 0 ? (
          projects.map((p) => (
            <Col xs={24} md={12} lg={8} key={p._id}>
              <Card
                size="small"
                title={p.name}
                extra={
                  <Tag color={p.status === 'completed' ? 'default' : 'processing'}>
                    {p.status === 'completed' ? 'Завершён' : 'Активен'}
                  </Tag>
                }
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {p.description || 'Нет описания'}
                  </Text>
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<UserOutlined />}
                      onClick={() => openMembers(p)}
                    >
                      Участники
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))
        ) : (
          <Col span={24}>
            <Card size="small">
              <Text type="secondary">У вас ещё нет проектов. Создайте первый проект.</Text>
            </Card>
          </Col>
        )}
      </Row>

      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateProject}
        title="Новый проект"
        okText="Создать"
      >
        <Form layout="vertical" form={createForm}>
          <Form.Item
            label="Название проекта"
            name="name"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={memberModalOpen}
        onCancel={() => setMemberModalOpen(false)}
        onOk={handleAddMember}
        okText="Пригласить"
        title={
          selectedProject ? `Участники проекта «${selectedProject.name}»` : 'Участники проекта'
        }
      >
        <Form layout="vertical" form={memberForm}>
          <Form.Item
            label="Email участника"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="user@example.com" prefix={<MailOutlined />} />
          </Form.Item>
        </Form>
        <List
          style={{ marginTop: 16 }}
          loading={loadingMembers}
          dataSource={members}
          locale={{ emptyText: 'Участников пока нет' }}
          renderItem={(m) => (
            <List.Item
              actions={
                currentUser.isAdmin || selectedProject?.ownerId === currentUser.id
                  ? [
                      <Button
                        key="remove"
                        icon={<DeleteOutlined />}
                        danger
                        size="small"
                        onClick={() => handleRemoveMember(m._id)}
                      />,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                avatar={<UserOutlined />}
                title={m.name}
                description={m.email}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
