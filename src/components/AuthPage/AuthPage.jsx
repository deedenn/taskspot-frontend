import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./AuthPage.css";

const CHECK_MAIL_STORAGE_KEY = "taskspot_registration_check_mail";

function readCheckMailState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHECK_MAIL_STORAGE_KEY) || "null");
    return typeof parsed?.email === "string" && parsed.email.includes("@") ? parsed : null;
  } catch {
    return null;
  }
}

function writeCheckMailState(state) {
  if (!state?.email) {
    sessionStorage.removeItem(CHECK_MAIL_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(CHECK_MAIL_STORAGE_KEY, JSON.stringify({
    email: state.email,
    status: state.status || "",
    source: state.source || "register"
  }));
}

export function AuthPage({ mode, auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const headingRef = useRef(null);
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const [inviteInfo, setInviteInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState(() => readCheckMailState()?.email || "");
  const [registrationEmailStatus, setRegistrationEmailStatus] = useState(() => readCheckMailState()?.status || "");
  const [checkMailSource, setCheckMailSource] = useState(() => readCheckMailState()?.source || "register");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const isRegister = mode === "register";
  const returnTo =
    typeof location.state?.returnTo === "string" && location.state.returnTo.startsWith("/app/")
      ? location.state.returnTo
      : "";
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

  useEffect(() => {
    if (registrationEmail) {
      window.setTimeout(() => headingRef.current?.focus(), 0);
    }
  }, [registrationEmail]);

  if (auth.user) {
    return <Navigate to={auth.user.isSuperAdmin ? "/app/admin" : returnTo || "/app/dashboard"} replace />;
  }

  function enterCheckMail({ email, status = "", source = "register" }) {
    const nextEmail = email?.trim().toLowerCase();
    if (!nextEmail) return;

    setRegistrationEmail(nextEmail);
    setRegistrationEmailStatus(status);
    setCheckMailSource(source);
    setChallenge(null);
    writeCheckMailState({ email: nextEmail, status, source });
  }

  function leaveCheckMail() {
    setRegistrationEmail("");
    setRegistrationEmailStatus("");
    setCheckMailSource("register");
    setResendMessage("");
    setError("");
    writeCheckMailState(null);
  }

  async function handleFinish(values) {
    if (submitting) return;
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
          enterCheckMail({
            email: data.email || values.email,
            status: data.emailDeliveryStatus || "",
            source: "register"
          });
          return;
        }
      }

      const signedInUser = await auth.signIn(challenge ? "/auth/login/code" : "/auth/login", challenge ? { challengeId: challenge, code: values.code } : values);
      if (signedInUser?.requiresAdminCode) {
        setChallenge(signedInUser.challengeId);
        form.resetFields();
        return;
      }
      navigate(signedInUser?.isSuperAdmin ? "/app/admin" : returnTo || "/app/dashboard", { replace: true });
    } catch (requestError) {
      if (requestError.data?.requiresEmailVerification) {
        enterCheckMail({
          email: requestError.data.email || values.email,
          status: requestError.data.emailDeliveryStatus || "",
          source: isRegister ? "register" : "login"
        });
        return;
      }

      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (resending || !registrationEmail) return;
    setResending(true);
    setError("");
    setResendMessage("");

    try {
      const data = await apiFetch("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email: registrationEmail })
      });
      setRegistrationEmailStatus(data.emailDeliveryStatus || "pending");
      writeCheckMailState({
        email: registrationEmail,
        status: data.emailDeliveryStatus || "pending",
        source: checkMailSource
      });
      setResendMessage(
        data.emailDeliveryStatus === "failed" || data.emailDeliveryStatus === "skipped"
          ? "Не удалось отправить письмо. Попробуйте ещё раз или обратитесь в поддержку."
          : "Письмо в очереди на отправку. Проверьте входящие через несколько минут."
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
          <div className="auth-page__check-mail">
            <Typography.Title level={1} tabIndex={-1} ref={headingRef}>Подтвердите email</Typography.Title>
            <Typography.Paragraph>
              Мы отправили ссылку подтверждения на <strong>{registrationEmail}</strong>. Перейдите по ней, чтобы открыть
              Taskspot и начать работу на Free-тарифе.
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary">
              После подтверждения мы автоматически создадим проект «Проект». В нём можно сразу добавить первую задачу,
              изменить название или создать ещё один проект.
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
                  ? "Попробуйте отправить ссылку повторно. Если ошибка повторится, обратитесь в поддержку."
                  : checkMailSource === "login"
                    ? "Этот аккаунт уже зарегистрирован, но email ещё не подтверждён. Можно отправить новую ссылку."
                    : "Если письма нет во входящих, проверьте папку спам или отправьте ссылку повторно."
              }
            />
            <div aria-live="polite">
              {resendMessage && <Alert className="auth-page__alert" type="success" message={resendMessage} showIcon />}
            </div>
            {error && <Alert className="auth-page__alert" type="error" message={error} showIcon />}
            <Space className="auth-page__actions" direction="vertical" size={12}>
              <Button type="primary" block loading={resending} onClick={resendVerification}>
                Отправить письмо повторно
              </Button>
              <Button block onClick={leaveCheckMail}>
                Изменить email
              </Button>
              <Button block onClick={() => { leaveCheckMail(); navigate("/login"); }}>
                Перейти ко входу
              </Button>
            </Space>
            <Typography.Paragraph className="auth-page__plan-note" type="secondary">
              Free назначится автоматически. Изменить тариф можно после подтверждения в разделе «Тарифы».
            </Typography.Paragraph>
          </div>
        ) : (
          <>
            <Typography.Title level={1}>
              {challenge ? "Подтвердите вход" : isRegister ? "Создать аккаунт" : "Войти"}
            </Typography.Title>
            <Typography.Paragraph>
              {challenge ? "Код отправлен на почту администратора. Он действует 10 минут." : isRegister
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
                    <Input prefix={<UserOutlined />} placeholder="Анна" autoComplete="given-name" />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    label="Фамилия"
                    rules={[{ required: true, message: "Укажите фамилию" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Смирнова" autoComplete="family-name" />
                  </Form.Item>
                </>
              )}
              {challenge ? <Form.Item name="code" label="Код из письма" rules={[{ required: true, pattern: /^\d{6}$/, message: "Введите 6 цифр" }]}><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus /></Form.Item> : <>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Укажите email" },
                  { type: "email", message: "Введите корректный email" }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="you@company.com" autoComplete="email" disabled={Boolean(inviteInfo)} />
              </Form.Item>
              <Form.Item
                name="password"
                label="Пароль"
                rules={passwordRules}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Пароль" autoComplete={isRegister ? "new-password" : "current-password"} />
              </Form.Item>
              </>}
              <Button type="primary" htmlType="submit" block loading={submitting}>
                {isRegister ? "Создать аккаунт" : "Войти"}
              </Button>
            </Form>

            {!isRegister && <div className="auth-page__switch">{challenge ? <Button onClick={() => { setChallenge(null); setError(""); form.resetFields(); }}>Вернуться ко входу</Button> : <Link to="/forgot-password">Забыли пароль?</Link>}</div>}
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
