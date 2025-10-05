import { Card, Space, Tag, Typography, Tooltip, Avatar } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useApp, statusLabels } from '../../store/AppContext';
import './Tasks.css';

const { Title } = Typography;

export default function TaskCard({ task, projectName, showProject = true }) {
    const { projects, users } = useApp();
    const project = projects.find(p => p.id === task.projectId);
    const assignee = users.find(u => u.id === task.assigneeId);
    const nav = useNavigate();

    return (
        <Card style={{ marginBottom: 12 }} hoverable onClick={() => nav(`/tasks/${task.id}`)}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                    <Tag>{statusLabels[task.status]}</Tag>
                    <Title level={5} style={{ margin: 0 }}>{task.title}</Title>
                </Space>
                <Space>
                    {task.dueDate && <Tag>Дедлайн: {dayjs(task.dueDate).format('DD.MM.YYYY')}</Tag>}
                    {showProject && <Tag>{projectName || project?.name}</Tag>}
                </Space>
            </Space>
            <div style={{ marginTop: 8 }}>
                {(task.categories || []).map((cid) => <Tag key={cid}>{project?.categories.find(c => c.id === cid)?.name}</Tag>)}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                {assignee && <Tooltip title="Ответственный"><Avatar size="small">{assignee.name[0]}</Avatar></Tooltip>}
            </div>
        </Card>
    );
}