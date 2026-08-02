import { CheckCircleOutlined, CloseCircleOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./VerifyEmail.css";

export function VerifyEmail({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);
  const [status, setStatus] = useState(token ? "loading" : "error");
  const [error, setError] = useState(token ? "" : "Ссылка подтверждения некорректна или неполная.");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    apiFetch("/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token })
    })
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        auth.setUser(data.user);
        setStatus("success");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="verify-email">
      <Link className="verify-email__brand" to="/">
        <BrandLogo />
      </Link>
      <Card className="verify-email__card">
        {status === "loading" && (
          <div className="verify-email__state">
            <Spin size="large" />
            <Typography.Title level={1}>Подтверждаем email</Typography.Title>
            <Typography.Paragraph>Это займет несколько секунд.</Typography.Paragraph>
          </div>
        )}

        {status === "success" && (
          <div className="verify-email__state">
            <CheckCircleOutlined className="verify-email__icon verify-email__icon--success" />
            <Typography.Title level={1}>Email подтвержден</Typography.Title>
            <Typography.Paragraph>
              Регистрация завершена. Теперь можно создавать проекты, приглашать команду и ставить задачи.
            </Typography.Paragraph>
            <Button type="primary" size="large" block onClick={() => navigate("/app/dashboard", { replace: true })}>
              Перейти в Taskspot
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="verify-email__state">
            <CloseCircleOutlined className="verify-email__icon verify-email__icon--error" />
            <Typography.Title level={1}>Не удалось подтвердить email</Typography.Title>
            <Alert className="verify-email__alert" type="error" message={error} showIcon />
            <Button size="large" block icon={<MailOutlined />} onClick={() => navigate("/register")}>
              Зарегистрироваться заново
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
