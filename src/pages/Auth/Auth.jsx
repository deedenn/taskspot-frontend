import { useState } from 'react';
import { Card, Typography, Radio, Form, Input, Select, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import './Auth.css';

const { Title } = Typography;

export default function Auth() {
    const { users, register, login } = useApp();
    const [mode, setMode] = useState('login');
    const [form] = Form.useForm();
    const nav = useNavigate();

    const submit = (values) => {
        if (mode === 'register') {
            const ok = register(values);
            if (ok) nav('/dashboard');
        } else {
            login(values.userId);
            nav('/dashboard');
        }
    };

    return (
        <Card style={{ maxWidth: 520, margin: '24px auto' }}>
            <Title level={3}>{mode === 'register' ? 'Регистрация' : 'Вход'}</Title>
            <Radio.Group value={mode} onChange={e => setMode(e.target.value)} style={{ marginBottom: 16 }}>
                <Radio.Button value="login">Вход</Radio.Button>
                <Radio.Button value="register">Регистрация</Radio.Button>
            </Radio.Group>
            <Form form={form} layout="vertical" onFinish={submit}>
                {mode === 'register' ? (
                    <>
                        <Form.Item name="name" label="Имя" rules={[{ required: true }]}> <Input /> </Form.Item>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> <Input /> </Form.Item>
                    </>
                ) : (
                    <Form.Item name="userId" label="Выберите пользователя" rules={[{ required: true }]}>
                        <Select options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))} />
                    </Form.Item>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button htmlType="submit" type="primary">{mode === 'register' ? 'Зарегистрироваться' : 'Войти'}</Button>
                </div>
            </Form>
        </Card>
    );
}