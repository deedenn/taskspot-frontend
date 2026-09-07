import { DeleteOutlined, FolderAddOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Select, Space, Tag, Tooltip, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, isLimitError, limitErrorText } from "../../api.js";
import "./ProjectTemplates.css";

export function ProjectTemplates({ currentUser }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [createForm] = Form.useForm();
  const [saveForm] = Form.useForm();
  const request = useRef(null);
  const inFlight = useRef(false);
  const ownProjects = projects.filter((project) => project.members?.some((member) =>
    String(member.user?._id || member.user) === String(currentUser?._id) && member.role === "admin"
  ));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const library = await apiFetch("/project-templates");
      setTemplates(library.templates);
      const available = await apiFetch("/projects");
      setProjects(available.projects);
    } catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function open(template) {
    request.current = null;
    setSelected(template);
    setActionError(null);
    createForm.setFieldsValue({ name: template.name, startDate: dayjs() });
  }

  async function create(values) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError(null);
    const payload = { name: values.name.trim(), startDate: values.startDate.format("YYYY-MM-DD") };
    const signature = JSON.stringify([selected._id, payload]);
    if (request.current?.signature !== signature) {
      request.current = { signature, id: crypto.randomUUID() };
    }
    try {
      const result = await apiFetch("/project-templates/" + selected._id + "/projects", {
        method: "POST", body: JSON.stringify({ ...payload, requestId: request.current.id })
      });
      message.success("Проект создан");
      navigate("/app/projects/" + result.project._id);
    } catch (error) { setActionError(error); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function save(values) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const result = await apiFetch("/project-templates", { method: "POST", body: JSON.stringify(values) });
      setTemplates((items) => [...items, result.template]);
      setSaving(false);
      message.success("Шаблон сохранён");
    } catch (error) { setActionError(error); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function remove(template) {
    try {
      await apiFetch("/project-templates/" + template._id, { method: "DELETE" });
      setTemplates((items) => items.filter((item) => item._id !== template._id));
      message.success("Шаблон удалён");
    } catch (error) { message.error(limitErrorText(error)); }
  }

  const failure = actionError && <Alert type="error" showIcon message={limitErrorText(actionError)}
    action={isLimitError(actionError) ? <Button onClick={() => navigate("/app/billing")}>Тарифы</Button> : undefined} />;

  return <section className="project-templates">
    <header className="project-templates__header">
      <Typography.Title level={1}>Шаблоны проектов</Typography.Title>
      <Button icon={<SaveOutlined />} disabled={!ownProjects.length || loading} onClick={() => {
        saveForm.resetFields(); setActionError(null); setSaving(true);
      }}>Сохранить проект как шаблон</Button>
    </header>
    {error && <Alert type="error" message={error} action={<Button onClick={load}>Повторить</Button>} />}
    {loading ? <Card loading /> : <div className="project-templates__grid">
      {templates.map((template) => <Card key={template._id} className="project-templates__card">
        <div className="project-templates__card-head">
          <Tag>{template.builtin ? "Готовый" : "Мой шаблон"}</Tag>
          {!template.builtin && <Popconfirm title="Удалить шаблон?" description="Созданные из него проекты останутся."
            okText="Удалить" cancelText="Отмена" onConfirm={() => remove(template)}>
            <Tooltip title="Удалить шаблон"><Button danger type="text" icon={<DeleteOutlined />} aria-label={"Удалить " + template.name} /></Tooltip>
          </Popconfirm>}
        </div>
        <Typography.Title level={3}>{template.name}</Typography.Title>
        <Typography.Paragraph className="project-templates__description">{template.description}</Typography.Paragraph>
        <Typography.Text type="secondary">{template.tasks.length} задач · {template.categories.length} категорий</Typography.Text>
        <Button icon={<FolderAddOutlined />} onClick={() => open(template)}>Создать проект</Button>
      </Card>)}
      {!templates.length && <Empty description="Шаблонов пока нет" />}
    </div>}

    <Modal title={selected?.name} open={Boolean(selected)} onCancel={() => { if (!busy) setSelected(null); }}
      closable={!busy} maskClosable={!busy} keyboard={!busy} footer={null} width={680}>
      <Form form={createForm} layout="vertical" onFinish={create} disabled={busy}>
        {failure}
        <div className="project-templates__fields">
          <Form.Item name="name" label="Название проекта" rules={[{ required: true, whitespace: true, message: "Введите название" }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="startDate" label="Дата начала" rules={[{ required: true, message: "Выберите дату" }]}>
            <DatePicker format="DD.MM.YYYY" allowClear={false} />
          </Form.Item>
        </div>
        <Space wrap>{selected?.categories.map((category) => <Tag key={category.key} color={category.color}>{category.name}</Tag>)}</Space>
        <ol className="project-templates__preview">
          {selected?.tasks.map((task, index) => <li key={index}>
            <strong>{task.description}</strong>
            <Typography.Text type="secondary">{task.dueOffsetDays == null ? "Без срока" : task.dueOffsetDays === 0 ? "В день начала" : "Через " + task.dueOffsetDays + " дн."}</Typography.Text>
            {!!task.checklist.length && <ul>{task.checklist.map((item, i) => <li key={i}>{item.text}</li>)}</ul>}
          </li>)}
        </ol>
        <Button type="primary" htmlType="submit" loading={busy} icon={<FolderAddOutlined />}>Создать проект</Button>
      </Form>
    </Modal>
    <Modal title="Сохранить проект как шаблон" open={saving} onCancel={() => { if (!busy) setSaving(false); }}
      closable={!busy} maskClosable={!busy} keyboard={!busy} footer={null}>
      <Form form={saveForm} layout="vertical" onFinish={save} disabled={busy}>
        {failure}
        <Form.Item name="projectId" label="Проект" rules={[{ required: true, message: "Выберите проект" }]}>
          <Select showSearch optionFilterProp="label" options={ownProjects.map((project) => ({ value: project._id, label: project.name }))} />
        </Form.Item>
        <Form.Item name="name" label="Название шаблона" rules={[{ required: true, whitespace: true, message: "Введите название" }]}>
          <Input maxLength={160} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} icon={<SaveOutlined />}>Сохранить шаблон</Button>
      </Form>
    </Modal>
  </section>;
}
