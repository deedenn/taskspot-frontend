import { Button, Card, Col, Form, Input, Modal, Row, Space, Tag, Typography } from 'antd';
import { PlusOutlined, TeamOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';

const { Title, Paragraph } = Typography;

export default function ProjectsList() {
    const { projects, currentUser, isProjectMember, createProject } = useApp();
    const mine = projects.filter(p => currentUser && isProjectMember(p, currentUser.id));
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const nav = useNavigate();

    const submit = (values) => {
        const id = createProject(values);
        setOpen(false); form.resetFields();
        if (id) nav(`/projects/${id}`);
    };

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Мои проекты</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Создать проект</Button>
            </Space>
            <Row gutter={[16, 16]}>
                {mine.map(p => (
                    <Col xs={24} md={12} key={p.id}>
                        <Card hoverable onClick={() => nav(`/projects/${p.id}`)}>
                            <Title level={4} style={{ marginBottom: 8 }}>{p.name}</Title>
                            <Paragraph type="secondary" style={{ minHeight: 40 }}>{p.description || 'Без описания'}</Paragraph>
                            <Space>
                                <Tag icon={<TeamOutlined />}>{p.members.length} участника</Tag>
                                <Tag icon={<FolderOpenOutlined />}>{p.categories.length} категорий</Tag>
                            </Space>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Modal title="Новый проект" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Создать">
                <Form form={form} layout="vertical" onFinish={submit}>
                    <Form.Item name="name" label="Название" rules={[{ required: true }]}> <Input /> </Form.Item>
                    <Form.Item name="description" label="Описание"> <Input.TextArea rows={3} /> </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}