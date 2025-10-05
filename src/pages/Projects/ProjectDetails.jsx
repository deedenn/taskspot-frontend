import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Avatar, Button, Card, Col, Empty, Form, Input, List, Modal, Row, Space, Tag, Typography } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import TaskCard from '../Tasks/TaskCard';
import TaskDrawer from '../Tasks/TaskDrawer';
import TaskFilters from '../Tasks/TaskFilters';

const { Title, Paragraph, Text } = Typography;

function AddMember({ project }) {
    const { users, addProjectMember } = useApp();
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const candidates = users.filter(u => !project.members.some(m => m.userId === u.id));
    return (
        <>
            <Button size="small" onClick={() => setOpen(true)} icon={<PlusOutlined />}>Добавить</Button>
            <Modal title="Добавить участника" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Добавить">
                <Form form={form} layout="vertical" onFinish={(v) => { addProjectMember(project.id, v.userId, v.role); setOpen(false); }}>
                    <Form.Item name="userId" label="Пользователь" rules={[{ required: true }]}> <Input list="cand" placeholder="Начните вводить" /> </Form.Item>
                    <datalist id="cand">
                        {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                    </datalist>
                    <Form.Item name="role" label="Роль" initialValue="member"> <Input placeholder="member|admin" /> </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

function AddCategory({ project }) {
    const { upsertCategory } = useApp();
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    return (
        <>
            <Button size="small" onClick={() => setOpen(true)} icon={<PlusOutlined />}>Добавить</Button>
            <Modal title="Новая категория" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Создать">
                <Form form={form} layout="vertical" onFinish={(v) => { upsertCategory(project.id, v.name); setOpen(false); }}>
                    <Form.Item name="name" label="Название" rules={[{ required: true }]}> <Input /> </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

export default function ProjectDetails() {
    const { id } = useParams();
    const nav = useNavigate();
    const { projects, users, tasks, currentUser, isProjectMember, isProjectAdmin, deleteCategory, canSeeTask, createTask } = useApp();
    const project = projects.find(p => p.id === id);
    const [showTaskDrawer, setShowTaskDrawer] = useState(false);
    const [filters, setFilters] = useState({ q: '', statuses: [], categories: [], role: 'any', dueFrom: null, dueTo: null });

    if (!project) return <Empty description="Проект не найден" />;
    if (!currentUser || !isProjectMember(project, currentUser.id)) return <Empty description="Нет доступа к проекту" />;

    const visible = tasks.filter(t => t.projectId === project.id && canSeeTask(t, currentUser.id));
    const filtered = useMemo(() => {
        return visible.filter(t => {
            const q = (filters.q || '').trim().toLowerCase();
            if (q) {
                const hay = `${t.title} ${t.description || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
            if (filters.categories.length && !filters.categories.every(cid => t.categories.includes(cid))) return false;
            if (filters.role === 'initiator' && t.createdBy !== currentUser.id) return false;
            if (filters.role === 'assignee' && t.assigneeId !== currentUser.id) return false;
            if (filters.role === 'watcher' && !t.watcherIds.includes(currentUser.id)) return false;
            if (filters.dueFrom || filters.dueTo) {
                const d = t.dueDate ? new Date(t.dueDate).getTime() : null;
                if (d === null) return false;
                if (filters.dueFrom && d < filters.dueFrom.startOf('day').toDate().getTime()) return false;
                if (filters.dueTo && d > filters.dueTo.endOf('day').toDate().getTime()) return false;
            }
            return true;
        });
    }, [visible, filters, currentUser.id]);

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button onClick={() => nav('/projects')}>Назад</Button>
                <Title level={2} style={{ margin: 0 }}>{project.name}</Title>
            </Space>
            <Paragraph type="secondary">{project.description || '—'}</Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Card title="Участники" extra={isProjectAdmin(project, currentUser.id) && <AddMember project={project} />}>
                        <List
                            dataSource={project.members}
                            renderItem={(m) => {
                                const u = users.find(x => x.id === m.userId);
                                return (
                                    <List.Item>
                                        <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={u?.name} description={<Tag color={m.role === 'admin' ? 'gold' : 'default'}>{m.role}</Tag>} />
                                    </List.Item>
                                );
                            }}
                        />
                    </Card>

                    <Card title="Категории" style={{ marginTop: 16 }} extra={isProjectAdmin(project, currentUser.id) && <AddCategory project={project} />}>
                        <Space wrap>
                            {project.categories.length ? project.categories.map(c => (
                                <Tag key={c.id} closable={isProjectAdmin(project, currentUser.id)} onClose={() => deleteCategory(project.id, c.id)}>{c.name}</Tag>
                            )) : <Text type="secondary">Пока пусто</Text>}
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} md={14}>
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Title level={4} style={{ margin: 0 }}>Задачи</Title>
                        <Button type="primary" onClick={() => setShowTaskDrawer(true)}>Новая задача</Button>
                    </Space>
                    <TaskFilters project={project} value={filters} onChange={setFilters} />
                    <List dataSource={filtered} renderItem={(t) => <TaskCard task={t} projectName={project.name} showProject={false} />} />
                </Col>
            </Row>

            <TaskDrawer
                open={showTaskDrawer}
                onClose={() => setShowTaskDrawer(false)}
                onSubmit={(values) => { createTask({ ...values, projectId: project.id }); setShowTaskDrawer(false); }}
                project={project}
            />
        </div>
    );
}