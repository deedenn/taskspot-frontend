import React from 'react';
import { Modal, Form, Input, Space, Button } from 'antd';
import './CategoryForm.css';

function CategoryForm({ open, loading = false, onCancel, onSubmit }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    const payload = {
      name: values.name.trim(),
      color: '#1677ff',
    };
    onSubmit && onSubmit(payload);
  };

  return (
    <Modal
      title="Новая категория"
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={null}
      width={420}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Название категории"
          name="name"
          rules={[
            { required: true, message: 'Введите название категории' },
            { max: 100, message: 'Максимум 100 символов' },
          ]}
        >
          <Input placeholder="Например: Backend" />
        </Form.Item>

        <Form.Item className="category-form-actions">
          <Space>
            <Button onClick={onCancel}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Сохранить
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default CategoryForm;
