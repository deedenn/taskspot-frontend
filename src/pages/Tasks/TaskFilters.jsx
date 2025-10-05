import { Button, DatePicker, Input, Select, Space, Tag } from 'antd';
const { RangePicker } = DatePicker;

export default function TaskFilters({ project, value, onChange }) {
    const v = value || { q: '', statuses: [], categories: [], role: 'any', dueFrom: null, dueTo: null };
    const set = (patch) => onChange({ ...v, ...patch });

    const statusOpts = [
        { value: 'open', label: 'открыта' },
        { value: 'in_progress', label: 'в работе' },
        { value: 'done', label: 'выполнено' },
        { value: 'closed', label: 'закрыта' },
    ];
    const catOpts = (project?.categories || []).map(c => ({ value: c.id, label: c.name }));
    const roleOpts = [
        { value: 'any', label: 'любая роль' },
        { value: 'initiator', label: 'инициатор' },
        { value: 'assignee', label: 'ответственный' },
        { value: 'watcher', label: 'наблюдатель' },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
            <Space wrap>
                <Input placeholder="Поиск по заголовку/описанию" value={v.q} onChange={e => set({ q: e.target.value })} style={{ minWidth: 260 }} allowClear />
                <Select mode="multiple" placeholder="Статусы" value={v.statuses} onChange={(x) => set({ statuses: x })} options={statusOpts} style={{ minWidth: 220 }} allowClear />
                <Select mode="multiple" placeholder="Категории" value={v.categories} onChange={(x) => set({ categories: x })} options={catOpts} style={{ minWidth: 220 }} allowClear />
                <Select placeholder="Роль" value={v.role} onChange={(x) => set({ role: x })} options={roleOpts} style={{ minWidth: 180 }} />
                <RangePicker onChange={(vals) => set({ dueFrom: vals?.[0] || null, dueTo: vals?.[1] || null })} />
                <Button onClick={() => onChange({ q: '', statuses: [], categories: [], role: 'any', dueFrom: null, dueTo: null })}>Сброс</Button>
            </Space>
            <Tag>Фильтры применяются на клиенте</Tag>
        </Space>
    );
}