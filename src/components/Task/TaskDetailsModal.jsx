import React from 'react';
import { Modal, Tag, Descriptions, Alert, Space, Button } from 'antd';
import dayjs from 'dayjs';
import { STATUS_META } from '../../constants/statusMeta';
import './TaskDetailsModal.css';

function TaskDetailsModal({
  open,
  task,
  currentUser,
  users,
  onClose,
  onEdit,
  onMarkDone,
  onConfirmCompletion,
  onRequestRework,
}) {
  if (!task) return null;

  const statusMeta = STATUS_META[task.status] || {};
  const dueLabel = task.dueDate
    ? dayjs(task.dueDate).format('DD.MM.YYYY')
    : '—';

  const assigneeId =
    typeof task.assignee === 'string'
      ? task.assignee
      : task.assignee?._id;

  const isCreator =
    currentUser && task.creatorId === currentUser._id;
  const isAssignee =
    currentUser && assigneeId === currentUser._id;

  const canEdit = isCreator;
  const canMarkDone =
    isAssignee &&
    task.status !== STATUS_META.done.key &&
    task.status !== STATUS_META.closed.key;
  const canConfirmOrRework =
    isCreator &&
    task.status === STATUS_META.done.key &&
    task.awaitingConfirmation;

  const creatorUser =
    users?.find((u) => u._id === task.creatorId) || null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={task.title}
      width={640}
    >
      {canConfirmOrRework && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Исполнитель отметил задачу как выполненную. Подтвердите выполнение или отправьте на доработку."
        />
      )}

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Статус">
          <Tag color={statusMeta.color}>
            {statusMeta.label || task.status}
          </Tag>
          {task.awaitingConfirmation && (
            <Tag color="processing" style={{ marginLeft: 8 }}>
              Ожидает подтверждения инициатора
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Срок">
          {dueLabel}
        </Descriptions.Item>
        <Descriptions.Item label="Инициатор">
          {creatorUser
            ? `${creatorUser.name} (${creatorUser.email})`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Ответственный">
          {task.assignee
            ? `${task.assignee.name} (${task.assignee.email})`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Категории">
          {task.categories?.length
            ? task.categories.map((cat) => (
                <Tag
                  key={cat._id}
                  color={cat.color || 'blue'}
                  className="task-details-category-tag"
                >
                  {cat.name}
                </Tag>
              ))
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Описание">
          <div className="task-details-description">
            {task.description || '—'}
          </div>
        </Descriptions.Item>
      </Descriptions>

      <div className="task-details-actions">
        <Space>
          {canEdit && (
            <Button onClick={() => onEdit && onEdit(task)}>
              Редактировать
            </Button>
          )}
        </Space>
        <Space>
          {canMarkDone && (
            <Button
              type="primary"
              onClick={() => onMarkDone && onMarkDone(task)}
            >
              Отметить как выполненную
            </Button>
          )}
          {canConfirmOrRework && (
            <>
              <Button
                onClick={() =>
                  onRequestRework && onRequestRework(task)
                }
              >
                Отправить на доработку
              </Button>
              <Button
                type="primary"
                onClick={() =>
                  onConfirmCompletion && onConfirmCompletion(task)
                }
              >
                Подтвердить выполнение
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
}

export default TaskDetailsModal;
