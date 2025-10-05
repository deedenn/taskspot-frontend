import { Drawer, Form, Input, DatePicker, Select, Button } from 'antd';

export default function TaskDrawer({ open, onClose, onSubmit, project }) {
    const [form] = Form.useForm();
    const userOpts = project.members.map(m => ({ value: m.userId, label: m.userId }));
    const catOpts = project.categories.map(c => ({ value: c.id, label: c.name }));

    return (
        <Drawer title="Новая задача" open={open} onClose={onClose} width={560} destroyOnClose>
            <Form form={form} layout="vertical" onFinish={(v) => {
                onSubmit({
                    title: v.title,
                    description: v.description,
                    dueDate: v.dueDate ? v.dueDate.format('YYYY-MM-DD') : undefined,
                    categories: v.categories || [],
                    assigneeId: v.assignee || null,
                    watcherIds: v.watchers || [],
                });
                form.resetFields();
            }}>
                <Form.Item name="title" label="Заголовок" rules={[{ required: true }]}> <Input /> </Form.Item>
                <Form.Item name="description" label="Описание"> <Input.TextArea rows={3} /> </Form.Item>
                <Form.Item name="dueDate" label="Срок выполнения"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
                <Form.Item name="categories" label="Категории"> <Select mode="multiple" options={catOpts} /> </Form.Item>
                <Form.Item name="assignee" label="Ответственный"> <Select allowClear options={userOpts} /> </Form.Item>
                <Form.Item name="watchers" label="Наблюдатели"> <Select mode="multiple" options={userOpts} /> </Form.Item>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={onClose}>Отмена</Button>
                    <Button type="primary" htmlType="submit">Создать</Button>
                </div>
            </Form>
        </Drawer>
    );
}