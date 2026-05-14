import { LockOutlined, SaveOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import "./Profile.css";

export function Profile({ auth }) {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = Form.useWatch("avatarUrl", profileForm);

  useEffect(() => {
    profileForm.setFieldsValue({
      name: auth.user?.name,
      email: auth.user?.email,
      phone: auth.user?.phone || "",
	    avatarUrl: auth.user?.avatarUrl || ""
	  });
	  setAvatarFailed(false);
  }, [auth.user, profileForm]);

  async function saveProfile(values) {
    try {
      const data = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(values)
      });
      auth.setUser(data.user);
      message.success("Профиль обновлён");
    } catch (error) {
      message.error(error.message);
    }
  }

  async function changePassword(values) {
    try {
      await apiFetch("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        })
      });
      passwordForm.resetFields();
      message.success("Пароль изменён");
    } catch (error) {
      message.error(error.message);
    }
  }

  return (
    <section className="profile">
      <div className="profile__head">
        <div>
          <Typography.Title level={1}>Профиль</Typography.Title>
          <Typography.Paragraph>Контактные данные, аватар и пароль пользователя.</Typography.Paragraph>
        </div>
      </div>

      <div className="profile__grid">
        <Card>
          <div className="profile__avatar">
	            <Avatar
	              size={96}
	              src={avatarFailed ? undefined : avatarUrl || auth.user?.avatarUrl}
	              icon={<UserOutlined />}
	              onError={() => {
	                setAvatarFailed(true);
	                message.warning("Не удалось загрузить аватар");
	                return false;
	              }}
	            />
            <div>
              <Typography.Title level={3}>{auth.user?.name}</Typography.Title>
              <Typography.Text type="secondary">{auth.user?.email}</Typography.Text>
            </div>
          </div>

          <Form form={profileForm} layout="vertical" onFinish={saveProfile}>
            <Form.Item name="name" label="Имя" rules={[{ required: true, message: "Укажите имя" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input disabled />
            </Form.Item>
            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7..." />
            </Form.Item>
            <Form.Item name="avatarUrl" label="Аватар">
              <Input placeholder="https://..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              Сохранить
            </Button>
          </Form>
        </Card>

        <Card
          title={
            <Space>
              <LockOutlined />
              Смена пароля
            </Space>
          }
        >
          <Form form={passwordForm} layout="vertical" onFinish={changePassword}>
            <Form.Item
              name="currentPassword"
              label="Текущий пароль"
              rules={[{ required: true, message: "Введите текущий пароль" }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Новый пароль"
              rules={[
                { required: true, message: "Введите новый пароль" },
                { min: 6, message: "Минимум 6 символов" }
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Повторите пароль"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Повторите новый пароль" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Пароли не совпадают"));
                  }
                })
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Button htmlType="submit" icon={<LockOutlined />}>
              Изменить пароль
            </Button>
          </Form>
        </Card>
      </div>
    </section>
  );
}
