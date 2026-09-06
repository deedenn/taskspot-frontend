import { useState } from "react";
import { Alert, Button, Form, Input, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { apiFetch } from "../../api.js";
export function AdminSecurity({ auth }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(values) {
    setBusy(true); setError("");
    try {
      await apiFetch("/auth/password", { method: "PATCH", body: JSON.stringify(values) });
      auth.signOut();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section style={{ maxWidth: 480 }}>
    <Typography.Title level={2}>Безопасность</Typography.Title>
    {error && <Alert type="error" showIcon message={error} />}
    <Form layout="vertical" onFinish={submit}>
      <Form.Item name="currentPassword" label="Текущий пароль" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item>
      <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true, min: 12, message: "Минимум 12 символов" }, { pattern: /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d)(?=.*[^\p{L}\p{N}\s]).+$/u, message: "Нужны буквы, цифры и специальный символ" }]}><Input.Password autoComplete="new-password" /></Form.Item>
      <Form.Item name="confirm" label="Повторите пароль" dependencies={["newPassword"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue("newPassword") ? Promise.resolve() : Promise.reject(new Error("Пароли не совпадают")) })]}><Input.Password autoComplete="new-password" /></Form.Item>
      <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={busy}>Изменить пароль и выйти</Button>
    </Form>
  </section>;
}
