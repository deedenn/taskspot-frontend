import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Space, Button } from 'antd';
import dayjs from 'dayjs';
import { STATUS_META } from '../../constants/statusMeta';
import './TaskForm.css';

function TaskForm({
  open,
  loading = false,
  mode = 'create', // 'create' | 'edit'
  initialTask,
  projectUsers,
  categories,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialTask) {
      form.setFieldsValue({
        title: initialTask.title,
        description: initialTask.description,
        status: initialTask.status || STATUS_META.open.key,
        dueDate: initialTask.dueDate ? dayjs(initialTask.dueDate) : null,
        categories: (initialTask.categories || []).map((c) => c._id),
        assignee: initialTask.assignee?._id,
        watchers: (initialTask.watchers || []).map((w) => w._id),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        // статус не показываем в форме, но по умолчанию он "open"
      });
    }
  }, [open, mode, initialTask, form]);

  const userOptions = projectUsers.map((u) => ({
    label: `${u.name} (${u.email})`,
    value: u._id,
  }));

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c._id,
  }));

  const disabledPastDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

  const handleFinish = (values) => {
    const status =
      mode === 'edit'
        ? values.status
        : STATUS_META.open.key;

    const payload = {
      title: values.title.trim(),
      description: values.description?.trim(),
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      categories: values.categories || [],
      assignee: values.assignee || null,
      watchers: values.watchers || [],
      status,
    };
    onSubmit && onSubmit(payload, mode === 'edit' ? initialTask : null);
  };

  return (
    <Modal
      title={mode === 'edit' ? 'Редактирование задачи' : 'Новая задача'}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={null}
      width={720}
    >
      <Form
        form={form}
        layout="vertical"
        className="task-form"
        onFinish={handleFinish}
      >
        <Form.Item
          label="Название задачи"
          name="title"
          rules={[
            { required: true, message: 'Введите название задачи' },
            { max: 200, message: 'Максимум 200 символов' },
          ]}
        >
          <Input placeholder="Например: Подготовить отчёт по продажам" />
        </Form.Item>

        <Form.Item
          label="Описание"
          name="description"
          rules={[
            { required: true, message: 'Введите описание задачи' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Подробно опишите, что нужно сделать"
          />
        </Form.Item>

        <div className="task-form-row">
          <Form.Item
            label="Срок выполнения"
            name="dueDate"
            className="task-form-col"
            rules={[
              { required: true, message: 'Укажите срок выполнения' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const today = dayjs().startOf('day');
                  if (value.startOf('day').isBefore(today)) {
                    return Promise.reject(
                      new Error('Срок не может быть в прошлом')
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Выберите дату"
              disabledDate={disabledPastDate}
            />
          </Form.Item>

          {mode === 'edit' && (
            <Form.Item
              label="Статус"
              name="status"
              className="task-form-col"
              rules={[
                { required: true, message: 'Выберите статус задачи' },
              ]}
            >
              <Select
                options={Object.values(STATUS_META).map((s) => ({
                  value: s.key,
                  label: s.label,
                }))}
                placeholder="Выберите статус"
              />
            </Form.Item>
          )}
        </div>

        <Form.Item
          label="Категории"
          name="categories"
          tooltip="К задаче можно привязать несколько категорий"
        >
          <Select
            mode="multiple"
            options={categoryOptions}
            placeholder="Выберите категории"
            allowClear
          />
        </Form.Item>

        <div className="task-form-row">
          <Form.Item
            label="Ответственный"
            name="assignee"
            className="task-form-col"
            rules={[
              { required: true, message: 'Выберите ответственного' },
            ]}
          >
            <Select
              options={userOptions}
              placeholder="Кому назначить задачу"
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="Наблюдатели"
            name="watchers"
            className="task-form-col"
          >
            <Select
              mode="multiple"
              options={userOptions}
              placeholder="Выберите наблюдателей"
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
        </div>

        <Form.Item className="task-form-actions">
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

export default TaskForm;
