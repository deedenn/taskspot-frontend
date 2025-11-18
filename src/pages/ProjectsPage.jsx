import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  message,
  Select,
} from 'antd';
import {
  createProjectApi,
  updateProjectApi,
} from '../api/projects';
import ProjectMembersPanel from '../components/ProjectMembersPanel';

const { Title, Text } = Typography;
const { Option } = Select;

function ProjectsPage({ projects, setProjects, setCurrentProjectId }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'completed'),
    [projects]
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === 'completed'),
    [projects]
  );

  const selectedProject =
    projects.find((p) => p._id === selectedProjectId) || null;

  const openCreateModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const created = await createProjectApi({
        name: values.name,
        description: values.description || '',
      });
      setProjects((prev) => [...prev, created]);
      setCurrentProjectId(created._id);
      setSelectedProjectId(created._id);
      setModalOpen(false);
      message.success('Проект создан');
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось создать проект');
    }
  };

  const handleChangeStatus = async (project, status) => {
    try {
      const updated = await updateProjectApi(project._id, { status });
      setProjects((prev) =>
        prev.map((p) => (p._id === project._id ? updated : p))
      );
      message.success('Статус проекта обновлён');
    } catch (e) {
      message.error(e.message || 'Не удалось обновить проект');
    }
  };

  const handleSelectProject = (project) => {
    setCurrentProjectId(project._id);
    setSelectedProjectId(project._id);
  };

  const renderProjectCard = (project) => (
    <Card
      key={project._id}
      hoverable
      onClick={() => handleSelectProject(project)}
      style={{ marginBottom: 12 }}
    >
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={5} style={{ marginBottom: 4 }}>
            {project.name}
          </Title>
          <Text type="secondary">
            {project.description || 'Без описания'}
          </Text>
        </Col>
        <Col>
          <Tag color={project.status === 'completed' ? 'default' : 'processing'}>
            {project.status === 'completed' ? 'Завершён' : 'Активен'}
          </Tag>
          {project.status === 'completed' ? (
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                handleChangeStatus(project, 'active');
              }}
            >
              Вернуть в активные
            </Button>
          ) : (
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                handleChangeStatus(project, 'completed');
              }}
            >
              Завершить
            </Button>
          )}
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="Мои проекты"
            extra={
              <Button type="primary" onClick={openCreateModal}>
                Новый проект
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Title level={5}>Активные</Title>
                {activeProjects.length === 0 && (
                  <Text type="secondary">Нет активных проектов</Text>
                )}
                {activeProjects.map(renderProjectCard)}
              </Col>
              <Col xs={24} md={12}>
                <Title level={5}>Завершённые</Title>
                {completedProjects.length === 0 && (
                  <Text type="secondary">Нет завершённых проектов</Text>
                )}
                {completedProjects.map(renderProjectCard)}
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          {selectedProject ? (
            <ProjectMembersPanel project={selectedProject} />
          ) : (
            <Card size="small">
              <Text type="secondary">
                Выберите проект, чтобы управлять участниками и приглашениями.
              </Text>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        title="Новый проект"
        okText="Создать"
      >
        <Form layout="vertical" form={form}>
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
    </div>
  );
}

export default ProjectsPage;
