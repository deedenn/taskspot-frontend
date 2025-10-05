import { Button, Card, Col, Divider, Row, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const { Title, Paragraph } = Typography;

export default function Landing() {
    const nav = useNavigate();
    return (
        <div>
            <Title>Управляйте задачами и проектами</Title>
            <Paragraph>Демо‑таск‑менеджер на мок‑данных: проекты, роли, категории, комментарии и статусы.</Paragraph>
            <Space wrap>
                <Button type="primary" size="large" onClick={() => nav('/auth')}>Зарегистрироваться</Button>
                <Button size="large" onClick={() => nav('/auth')}>Войти</Button>
            </Space>
            <Divider />
            <Row gutter={[16, 16]}>
                {[
                    { title: 'Проекты и роли', desc: 'Создавайте проекты, добавляйте участников и категории.' },
                    { title: 'Задачи', desc: 'Описание, срок, категории, ответственный, наблюдатели, статус.' },
                    { title: 'Дашборд', desc: 'Инициатор / ответственный / наблюдатель.' },
                    { title: 'Комментарии и вложения', desc: 'Обсуждайте задачи, добавляйте вложения (мок).' },
                ].map((f, i) => (
                    <Col xs={24} md={12} key={i}>
                        <Card hoverable>
                            <Title level={4}>{f.title}</Title>
                            <Paragraph type="secondary">{f.desc}</Paragraph>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}