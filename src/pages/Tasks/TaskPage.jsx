import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button, Descriptions, Space, Tag, Typography, Avatar, Input, Divider, List, Empty, message } from 'antd';
import dayjs from 'dayjs';
import { useApp, statusLabels } from '../../store/AppContext';

const { Title, Paragraph, Text } = Typography;

export default function TaskPage() {
    const { id } = useParams();
    const nav = useNavigate();
    const { tasks, projects, users, updateTask, addAttachment, addComment, changeStatus, currentUser, canSeeTask } = useApp();
    const task = tasks.find(t => t.id === id);

    const project = useMemo(() => task ? projects.find(p => p.id === task.projectId) : null, [task, projects]);
    const assignee = useMemo(() => task ? users.find(u => u.id === task.assigneeId) : null, [task, users]);
    const creator = useMemo(() => task ? users.find(u => u.id === task.createdBy) : null, [task, users]);
    const watchers = useMemo(() => task ? users.filter(u => task.watcherIds.includes(u.id)) : [], [task, users]);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ title: '', description: '' });
    const [attachName, setAttachName] = useState('');
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (task) {
            if (!canSeeTask(task, currentUser?.id || '')) { message.error('Нет доступа к задаче'); nav(-1); return; }
            setForm({ title: task.title, description: task.description || '' });
        }
    }, [task]);

    if (!task) return <Empty description="Задача не найдена" />;

    const canChangeTo = (next) => {
        const allowed = { open: ['in_progress'], in_progress: ['done', 'open'], done: ['in_progress', 'closed'], closed: [] };
        if (!allowed[task.status].includes(next)) return false;
        if (next === 'closed' && task.createdBy !== currentUser?.id) return false;
        return true;
    };
    const targets = ['in_progress', 'done', 'closed', 'open'].filter(s => s !== task.status && canChangeTo(s));

    return (
        <div className="task-page">
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Space>
                    <Button onClick={() => nav(-1)}>Назад</Button>
                    <Title level={2} style={{ margin: 0 }}>Задача</Title>
                    <Tag>{statusLabels[task.status]}</Tag>
                </Space>
                {!editing && <Button onClick={() => setEditing(true)}>Редактировать</Button>}
            </Space>

            {!editing ? (
                <>
                    <Title level={4} style={{ marginTop: 0 }}>{task.title}</Title>
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{task.description || '—'}</Paragraph>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="Проект">{project?.name}</Descriptions.Item>
                        <Descriptions.Item label="Инициатор">{creator?.name}</Descriptions.Item>
                        <Descriptions.Item label="Ответственный">{assignee?.name || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Наблюдатели">{watchers.map(w => w.name).join(', ') || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Дедлайн">{task.dueDate ? dayjs(task.dueDate).format('DD.MM.YYYY') : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Категории">{task.categories.map(cid => project?.categories.find(c => c.id === cid)?.name).filter(Boolean).join(', ') || '—'}</Descriptions.Item>
                    </Descriptions>

                    <Divider />
                    <Title level={5}>Вложения</Title>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {task.attachments.length ? task.attachments.map((a, i) => (
                            <Tag key={i}>{a.filename}</Tag>
                        )) : <Text type="secondary">Нет вложений</Text>}
                        <Space.Compact style={{ width: '100%' }}>
                            <Input placeholder="Имя файла (мок)" value={attachName} onChange={e => setAttachName(e.target.value)} onPressEnter={() => { if (attachName) { addAttachment(task.id, attachName); setAttachName(''); } }} />
                            <Button type="primary" onClick={() => { if (attachName) { addAttachment(task.id, attachName); setAttachName(''); } }}>Добавить</Button>
                        </Space.Compact>
                    </Space>

                    <Divider />
                    <Title level={5}>Комментарии</Title>
                    <List
                        dataSource={task.comments}
                        locale={{ emptyText: <Empty description="Пока нет комментариев" /> }}
                        renderItem={(c) => {
                            const author = users.find(u => u.id === c.authorId);
                            return (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar>{author?.name?.[0]}</Avatar>}
                                        title={author?.name}
                                        description={
                                            <div>
                                                <div>{c.body}</div>
                                                <div>{dayjs(c.createdAt).format('DD.MM.YYYY HH:mm')}</div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />

                    <Divider />
                    <Title level={5}>Статус</Title>
                    <Space>
                        {['in_progress', 'done', 'closed', 'open'].filter(s => s !== task.status).map((s) => (
                            <Button key={s} disabled={!canChangeTo(s)} onClick={() => changeStatus(task, s)}>{statusLabels[s]}</Button>
                        ))}
                    </Space>
                </>
            ) : (
                <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Заголовок" />
                        <Input.TextArea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Описание" />
                        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                            <Button onClick={() => setEditing(false)}>Отмена</Button>
                            <Button type="primary" onClick={() => { updateTask(task.id, { title: form.title, description: form.description }); setEditing(false); }}>Сохранить</Button>
                        </Space>
                    </Space>
                </div>
            )}

            {!editing && targets.length > 0 && (
                <div className="task-action-bar">
                    <div className="actions">
                        {targets.map(s => (
                            <Button key={s} type={s === 'closed' ? 'primary' : 'default'} onClick={() => changeStatus(task, s)}>
                                {statusLabels[s]}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}