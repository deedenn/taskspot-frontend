import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
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
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationEmailStatus, setRegistrationEmailStatus] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const isRegister = mode === "register";
  const passwordRules = isRegister
    ? [
        { required: true, message: "Укажите пароль" },
        { min: 8, message: "Минимум 8 символов" },
        {
          pattern: /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).+$/,
          message: "Добавьте буквы и цифры"
        }
      ]
    : [{ required: true, message: "Укажите пароль" }];
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
    setResendMessage("");

    try {
      if (isRegister) {
        const data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify(values)
        });

        if (data.requiresEmailVerification) {
          setRegistrationEmail(data.email || values.email);
          setRegistrationEmailStatus(data.emailDeliveryStatus || "");
          return;
        }
      }

      const signedInUser = await auth.signIn("/auth/login", values);
      navigate(signedInUser?.isSuperAdmin ? "/app/admin" : "/app/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setError("");
    setResendMessage("");

    try {
      const data = await apiFetch("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email: registrationEmail })
      });
      setRegistrationEmailStatus(data.emailDeliveryStatus || "sent");
      setResendMessage(
        data.emailDeliveryStatus === "failed" || data.emailDeliveryStatus === "skipped"
          ? "Не удалось отправить письмо. Проверьте настройки SMTP и попробуйте ещё раз."
          : "Письмо отправлено повторно. Проверьте входящие и папку спам."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="auth-page__brand" to="/">
        <BrandLogo />
      </Link>
      <Card className="auth-page__card">
        {registrationEmail ? (
          <>
            <Typography.Title level={1}>Подтвердите email</Typography.Title>
            <Typography.Paragraph>
              Мы отправили ссылку подтверждения на <strong>{registrationEmail}</strong>. Перейдите по ссылке из письма,
              чтобы начать работу в Taskspot.
            </Typography.Paragraph>
            <Alert
              className="auth-page__alert"
              type={["failed", "skipped"].includes(registrationEmailStatus) ? "warning" : "info"}
              showIcon
              message={
                ["failed", "skipped"].includes(registrationEmailStatus)
                  ? "Письмо пока не отправлено"
                  : "Письмо может прийти в течение нескольких минут"
              }
              description={
                ["failed", "skipped"].includes(registrationEmailStatus)
                  ? "Попробуйте отправить ссылку повторно. Если ошибка повторится, проверьте настройки почты на сервере."
                  : "Если письма нет во входящих, проверьте папку спам или отправьте ссылку повторно."
              }
            />
            {resendMessage && <Alert className="auth-page__alert" type="success" message={resendMessage} showIcon />}
            {error && <Alert className="auth-page__alert" type="error" message={error} showIcon />}
            <Space className="auth-page__actions" direction="vertical" size={12}>
              <Button type="primary" block loading={resending} onClick={resendVerification}>
                Отправить письмо повторно
              </Button>
              <Button block onClick={() => navigate("/login")}>
                Перейти ко входу
              </Button>
            </Space>
          </>
        ) : (
          <>
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
                <>
                  <Form.Item
                    name="name"
                    label="Имя"
                    rules={[{ required: true, message: "Укажите имя" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Анна" />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    label="Фамилия"
                    rules={[{ required: true, message: "Укажите фамилию" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Смирнова" />
                  </Form.Item>
                </>
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
                rules={passwordRules}
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
          </>
        )}
      </Card>
    </main>
  );
}
