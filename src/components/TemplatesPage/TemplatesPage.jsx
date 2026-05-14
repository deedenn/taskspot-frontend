import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, List, Popconfirm, Select, Space, Tag, Tooltip, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./TemplatesPage.css";

const priorityOptions = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочно" }
];

export function TemplatesPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const project = useMemo(() => projects.find((item) => item._id === projectId), [projects, projectId]);

  async function loadProjects(preferredId) {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/projects");
      setProjects(data.projects);
      setProjectId((current) => preferredId || current || data.projects[0]?._id);
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

  async function createTemplate(values) {
    try {
      const data = await apiFetch(`/projects/${projectId}/templates`, {
        method: "POST",
        body: JSON.stringify({
          ...values,
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
      setProjects((items) => items.map((item) => (item._id === projectId ? { ...item, templates: data.templates } : item)));
      form.resetFields();
      message.success("Шаблон создан");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function deleteTemplate(templateId) {
    try {
      const data = await apiFetch(`/projects/${projectId}/templates/${templateId}`, { method: "DELETE" });
      setProjects((items) => items.map((item) => (item._id === projectId ? { ...item, templates: data.templates } : item)));
      message.success("Шаблон удалён");
    } catch (error) {
      message.error(error.message);
    }
  }

  return (
    <section className="templates-page">
      <div className="templates-page__head">
        <div>
          <Typography.Title level={1}>Шаблоны</Typography.Title>
          <Typography.Paragraph>
            Сохраняйте типовые поручения: еженедельные отчёты, контроль оплат, звонки клиентам.
          </Typography.Paragraph>
        </div>
      </div>

      {error && (
        <PageState
          type="error"
          description={error}
          onAction={() => loadProjects(projectId)}
        />
      )}

      <div className="templates-page__grid">
        <Card title="Новый шаблон" loading={loading}>
          <Form form={form} layout="vertical" onFinish={createTemplate} initialValues={{ priority: "medium", frequency: "none" }}>
            <Form.Item label="Проект" required>
              <Select
                value={projectId}
                options={projects.map((item) => ({ value: item._id, label: item.name }))}
                onChange={setProjectId}
              />
            </Form.Item>
            <Form.Item name="title" label="Название" rules={[{ required: true, message: "Введите название" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Описание" rules={[{ required: true, message: "Введите описание" }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="priority" label="Приоритет">
              <Select options={priorityOptions} />
            </Form.Item>
            <Form.Item name="frequency" label="Повтор">
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
              <Input.TextArea rows={4} placeholder={"Каждый пункт с новой строки"} />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} disabled={!projectId}>
              Создать шаблон
            </Button>
          </Form>
        </Card>

        <Card title={project ? `Шаблоны проекта ${project.name}` : "Шаблоны"} loading={loading}>
          {project?.templates?.length ? (
            <List
              dataSource={project.templates}
              renderItem={(template) => (
                <List.Item
	                  actions={[
	                    <Popconfirm
	                      key="delete"
	                      title="Удалить шаблон?"
	                      description="Это действие нельзя отменить."
	                      okText="Удалить"
	                      cancelText="Отмена"
	                      onConfirm={() => deleteTemplate(template._id)}
	                    >
	                      <Tooltip title="Удалить шаблон">
	                        <Button
	                          aria-label={`Удалить шаблон ${template.title}`}
	                          icon={<DeleteOutlined />}
	                          danger
	                        />
	                      </Tooltip>
	                    </Popconfirm>
	                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        {template.title}
                        <Tag>{priorityOptions.find((item) => item.value === template.priority)?.label}</Tag>
                        {template.recurrence?.enabled && <Tag color="blue">повтор</Tag>}
                      </Space>
                    }
                    description={template.description}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="Шаблонов пока нет" />
          )}
        </Card>
      </div>
    </section>
  );
}
