import { CameraOutlined, DeleteOutlined, LockOutlined, SaveOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../api.js";
import "./Profile.css";

const AVATAR_SIZE = 256;
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

function resizeAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = () => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const size = Math.min(image.width, image.height);
        const sourceX = (image.width - size) / 2;
        const sourceY = (image.height - size) / 2;

        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        context.drawImage(image, sourceX, sourceY, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.onerror = () => reject(new Error("Файл не похож на изображение"));
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

export function Profile({ auth }) {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileInputRef = useRef(null);
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

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      message.error("Выберите изображение");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      message.error("Файл аватара должен быть меньше 5 МБ");
      return;
    }

    try {
      const dataUrl = await resizeAvatarFile(file);
      profileForm.setFieldValue("avatarUrl", dataUrl);
      setAvatarFailed(false);
      message.success("Аватар выбран. Нажмите «Сохранить», чтобы применить");
    } catch (error) {
      message.error(error.message);
    }
  }

  function removeAvatar() {
    profileForm.setFieldValue("avatarUrl", "");
    setAvatarFailed(false);
    message.info("Аватар будет удалён после сохранения");
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
            <button
              type="button"
              className="profile__avatar-button"
              aria-label="Загрузить аватар"
              onClick={() => fileInputRef.current?.click()}
            >
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
              <span className="profile__avatar-overlay">
                <CameraOutlined />
              </span>
            </button>
            <input
              ref={fileInputRef}
              className="profile__avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <div>
              <Typography.Title level={3}>{auth.user?.name}</Typography.Title>
              <Typography.Text type="secondary">{auth.user?.email}</Typography.Text>
              {avatarUrl && (
                <Button
                  className="profile__avatar-remove"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={removeAvatar}
                  type="link"
                >
                  Удалить аватар
                </Button>
              )}
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
            <Form.Item name="avatarUrl" hidden>
              <Input />
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
