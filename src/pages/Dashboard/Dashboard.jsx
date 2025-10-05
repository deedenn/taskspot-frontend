import { Badge, Tabs, Typography, Table, Tag } from 'antd';
import { useApp, statusLabels } from '../../store/AppContext';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Dashboard() {
    const { tasks, currentUser, projects, users } = useApp();
    const nav = useNavigate();

    const mine = {
        asInitiator: tasks.filter(t => t.createdBy === currentUser?.id),
        asAssignee: tasks.filter(t => t.assigneeId === currentUser?.id),
        asWatcher: tasks.filter(t => t.watcherIds.includes(currentUser?.id || '')),
    };

    const columns = [
        {
            title: 'Задача',
            dataIndex: 'title',
            ellipsis: true,
            render: (v, t) => <span className="linklike" onClick={(e) => { e.stopPropagation(); nav(`/tasks/${t.id}`); }}>{v}</span>,
        },
        {
            title: 'Проект',
            dataIndex: 'projectId',
            render: (pid) => projects.find(p => p.id === pid)?.name || '—',
            width: 180,
            ellipsis: true,
            responsive: ['sm'],
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            width: 140,
            render: (s) => <Tag>{statusLabels[s]}</Tag>,
        },
        {
            title: 'Ответственный',
            dataIndex: 'assigneeId',
            width: 170,
            render: (uid) => users.find(u => u.id === uid)?.name || '—',
            responsive: ['sm'],
        },
        {
            title: 'Категории',
            dataIndex: 'categories',
            ellipsis: true,
            render: (c, t) => (c || []).map(cid => {
                const name = projects.find(p => p.id === t.projectId)?.categories.find(x => x.id === cid)?.name;
                return name ? <Tag key={cid}>{name}</Tag> : null;
            }),
            responsive: ['md'],
        },
        {
            title: 'Дедлайн',
            dataIndex: 'dueDate',
            width: 140,
            render: (d) => d ? dayjs(d).format('DD.MM.YYYY') : '—',
        },
        {
            title: 'Обновлено',
            dataIndex: 'updatedAt',
            width: 160,
            render: (d) => dayjs(d).format('DD.MM.YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.updatedAt).valueOf() - dayjs(b.updatedAt).valueOf(),
            defaultSortOrder: 'descend',
            responsive: ['md'],
        },
    ];

    const renderTable = (items) => (
        <Table
            size="middle"
            className="dashboard-table"
            dataSource={items}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: 'Нет задач' }}
            rowClassName={(t) => t.status === 'closed' ? 'row-closed' : ''}
            onRow={(t) => ({ onClick: () => nav(`/tasks/${t.id}`) })}
            scroll={{ x: 900 }}
        />
    );

    return (
        <div>
            <Title level={2}>Дашборд</Title>
            <Tabs
                items={[
                    { key: 'init', label: <span>Инициатор <Badge count={mine.asInitiator.length} /></span>, children: renderTable(mine.asInitiator) },
                    { key: 'assn', label: <span>Ответственный <Badge count={mine.asAssignee.length} /></span>, children: renderTable(mine.asAssignee) },
                    { key: 'watch', label: <span>Наблюдатель <Badge count={mine.asWatcher.length} /></span>, children: renderTable(mine.asWatcher) },
                ]}
            />
        </div>
    );
}