import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { apiFetch } from "../../api.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./AuthPage.css";

export function PasswordRecovery({ reset = false, auth }) {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.search).get("token") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(values) {
    setBusy(true); setError("");
    try {
      await apiFetch(reset ? "/auth/password/reset" : "/auth/password/forgot", {
        method: "POST", body: JSON.stringify(reset ? { token, password: values.password } : { email: values.email })
      });
      if (reset) auth.signOut();
      setDone(true);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-page">
    <Link to="/" className="auth-page__brand"><BrandLogo /></Link>
    <Card className="auth-page__card">
      <Typography.Title level={1}>{reset ? "Новый пароль" : "Восстановить доступ"}</Typography.Title>
      {error && <Alert className="auth-page__alert" type="error" showIcon message={error} />}
      {done ? <Alert type="success" showIcon message={reset ? "Пароль изменён" : "Проверьте почту"} description={reset ? "Войдите с новым паролем. Предыдущие сессии завершены." : "Если email принадлежит подтверждённому активному аккаунту, на него будет отправлена ссылка. Проверьте также папку спам."} /> :
        reset && !token ? <Alert type="error" message="В ссылке нет кода восстановления" /> :
        <Form layout="vertical" onFinish={submit}>
          {reset ? <>
            <Form.Item name="password" label="Новый пароль" rules={[{ required: true, min: 8, message: "Минимум 8 символов" }, { pattern: /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).+$/, message: "Добавьте буквы и цифры" }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="confirm" label="Повторите пароль" dependencies={["password"]} rules={[{ required: true, message: "Повторите пароль" }, ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Пароли не совпадают")) })]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </> : <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Введите корректный email" }]}><Input prefix={<MailOutlined />} autoComplete="email" /></Form.Item>}
          <Button type="primary" htmlType="submit" loading={busy} block>{reset ? "Изменить пароль" : "Отправить ссылку"}</Button>
        </Form>}
      <div className="auth-page__switch"><Link to="/login">Вернуться ко входу</Link></div>
      {reset && <div className="auth-page__switch"><Link to="/forgot-password">Запросить новую ссылку</Link></div>}
    </Card>
  </main>;
}
