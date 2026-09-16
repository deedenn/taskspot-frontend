import { CheckCircleOutlined, CloseCircleOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./VerifyEmail.css";

const CHECK_MAIL_STORAGE_KEY = "taskspot_registration_check_mail";
const verificationRequests = new Map();

function verifyToken(token) {
  if (!verificationRequests.has(token)) {
    const request = apiFetch("/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token })
    }).finally(() => verificationRequests.delete(token));
    verificationRequests.set(token, request);
  }
  return verificationRequests.get(token);
}

function readStoredEmail() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHECK_MAIL_STORAGE_KEY) || "null");
    return typeof parsed?.email === "string" ? parsed.email : "";
  } catch {
    return "";
  }
}

export function VerifyEmail({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuthUser = auth.setUser;
  const token = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);
  const [form] = Form.useForm();
  const [status, setStatus] = useState(token ? "loading" : "invalid");
  const [error, setError] = useState(token ? "" : "Ссылка подтверждения некорректна или неполная.");
  const [onboardingProjectId, setOnboardingProjectId] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    setStatus("loading");
    setError("");
    verifyToken(token)
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        setAuthUser(data.user);
        sessionStorage.removeItem(CHECK_MAIL_STORAGE_KEY);
        setOnboardingProjectId(data.onboarding?.projectId || "");
        setStatus("success");
        navigate("/verify-email", { replace: true });
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message);
        setStatus(requestError.status === 409 ? "conflict" : !requestError.status || requestError.status >= 500 ? "network" : "invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, retryNonce, setAuthUser, token]);

  async function resendVerification(values) {
    if (resending) return;
    const email = values.email?.trim().toLowerCase();
    if (!email) return;

    setResending(true);
    setError("");
    setResendMessage("");

    try {
      const data = await apiFetch("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      sessionStorage.setItem(CHECK_MAIL_STORAGE_KEY, JSON.stringify({
        email,
        status: data.emailDeliveryStatus || "pending",
        source: "verify"
      }));
      setResendMessage(
        data.emailDeliveryStatus === "failed" || data.emailDeliveryStatus === "skipped"
          ? "Письмо пока не отправилось. Попробуйте ещё раз или обратитесь в поддержку."
          : "Новая ссылка отправляется. Проверьте входящие и папку спам."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="verify-email">
      <Link className="verify-email__brand" to="/">
        <BrandLogo />
      </Link>
      <Card className="verify-email__card">
        {status === "loading" && (
          <div className="verify-email__state" role="status" aria-live="polite" aria-busy="true">
            <Spin size="large" />
            <Typography.Title level={1}>Подтверждаем email</Typography.Title>
            <Typography.Paragraph>Это займет несколько секунд.</Typography.Paragraph>
          </div>
        )}

        {status === "success" && (
          <div className="verify-email__state" role="status" aria-live="polite">
            <CheckCircleOutlined className="verify-email__icon verify-email__icon--success" />
            <Typography.Title level={1}>Email подтвержден</Typography.Title>
            <Typography.Paragraph>
              Регистрация завершена. Вы на Free-тарифе: можно вести проект «Проект», приглашать команду и ставить задачи.
            </Typography.Paragraph>
            <Space className="verify-email__actions" direction="vertical" size={12}>
              <Button
                type="primary"
                size="large"
                block
                onClick={() => navigate(onboardingProjectId ? `/app/projects/${onboardingProjectId}/tasks` : "/app/dashboard", { replace: true })}
              >
                Создать первую задачу
              </Button>
              <Button size="large" block onClick={() => navigate("/app/dashboard", { replace: true })}>
                Перейти на главную
              </Button>
              <Link to="/app/billing">Посмотреть лимиты Free и тарифы</Link>
            </Space>
          </div>
        )}

        {status === "network" && (
          <div className="verify-email__state" role="alert">
            <CloseCircleOutlined className="verify-email__icon verify-email__icon--error" />
            <Typography.Title level={1}>Не удалось проверить ссылку</Typography.Title>
            <Alert
              className="verify-email__alert"
              type="error"
              message={error}
              description="Проверьте соединение и повторите запрос. Ссылка не будет использована, пока подтверждение не завершится."
              showIcon
            />
            <Button type="primary" size="large" block onClick={() => setRetryNonce((value) => value + 1)}>
              Попробовать ещё раз
            </Button>
          </div>
        )}

        {(status === "invalid" || status === "conflict") && (
          <div className="verify-email__state" role="status" aria-live="polite">
            <CloseCircleOutlined className="verify-email__icon verify-email__icon--error" />
            <Typography.Title level={1}>
              {status === "conflict" ? "Нужно повторить подтверждение" : "Ссылка устарела или неверна"}
            </Typography.Title>
            <Alert
              className="verify-email__alert"
              type={status === "conflict" ? "warning" : "error"}
              message={error}
              description="Укажите email аккаунта — мы отправим новую ссылку подтверждения без повторной регистрации."
              showIcon
            />
            {resendMessage && <Alert className="verify-email__alert" type="success" message={resendMessage} showIcon />}
            <Form
              className="verify-email__resend-form"
              form={form}
              layout="vertical"
              size="large"
              initialValues={{ email: readStoredEmail() }}
              onFinish={resendVerification}
            >
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Укажите email" },
                  { type: "email", message: "Введите корректный email" }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="you@company.com" autoComplete="email" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={resending}>
                Отправить новую ссылку
              </Button>
            </Form>
            <Button className="verify-email__secondary" size="large" block onClick={() => navigate("/login")}>
              Перейти ко входу
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
