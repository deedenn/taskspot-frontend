import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./AuthPage.css";

export function AuthPage({ mode, auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [error, setError] = useState("");
  const [inviteInfo, setInviteInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const invitationToken = useMemo(
    () => new URLSearchParams(location.search).get("invite"),
    [location.search]
  );

  useEffect(() => {
    if (!isRegister || !invitationToken) return;

    let cancelled = false;

    apiFetch(`/auth/invitations/${invitationToken}`)
      .then(({ invitation }) => {
        if (cancelled) return;
        setInviteInfo(invitation);
        form.setFieldsValue({
          email: invitation.email,
          invitationToken
        });
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form, invitationToken, isRegister]);

  if (auth.user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function handleFinish(values) {
    setSubmitting(true);
    setError("");

    try {
      await auth.signIn(isRegister ? "/auth/register" : "/auth/login", values);
      navigate("/app/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="auth-page__brand" to="/">
        <BrandLogo />
      </Link>
      <Card className="auth-page__card">
        <Typography.Title level={1}>
          {isRegister ? "Создать аккаунт" : "Войти"}
        </Typography.Title>
        <Typography.Paragraph>
          {isRegister
            ? "Зарегистрируйтесь по email, чтобы создавать проекты и ставить задачи."
            : "Введите email и пароль, чтобы открыть рабочее пространство."}
        </Typography.Paragraph>

        {inviteInfo && (
          <Alert
            className="auth-page__alert"
            type="info"
            showIcon
            message={`Приглашение в проект «${inviteInfo.project.name}»`}
            description={`Зарегистрируйтесь с email ${inviteInfo.email}, чтобы присоединиться к проекту.`}
          />
        )}

        {error && <Alert className="auth-page__alert" type="error" message={error} showIcon />}

        <Form form={form} layout="vertical" size="large" onFinish={handleFinish}>
          {isRegister && invitationToken && (
            <Form.Item name="invitationToken" hidden initialValue={invitationToken}>
              <Input />
            </Form.Item>
          )}
          {isRegister && (
            <Form.Item
              name="name"
              label="Имя"
              rules={[{ required: true, message: "Укажите имя" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Анна Смирнова" />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Укажите email" },
              { type: "email", message: "Введите корректный email" }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@company.com" disabled={Boolean(inviteInfo)} />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, min: 6, message: "Минимум 6 символов" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            {isRegister ? "Зарегистрироваться" : "Войти"}
          </Button>
        </Form>

        <div className="auth-page__switch">
          {isRegister ? (
            <Link to="/login">Уже есть аккаунт? Войти</Link>
          ) : (
            <Link to="/register">Нет аккаунта? Зарегистрироваться</Link>
          )}
        </div>
      </Card>
    </main>
  );
}
