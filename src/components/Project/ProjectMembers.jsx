import React, { useState, useMemo } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Typography,
  Popconfirm,
  Input,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import './ProjectMembers.css';

const { Text } = Typography;

function ProjectMembers({
  project,
  users,
  currentUser,
  canManageMembers,
  onAddMember,
  onRemoveMember,
  onRevokeInvite,
}) {
  const owner = useMemo(
    () => users.find((u) => u._id === project.ownerId),
    [users, project]
  );

  const memberUsers = useMemo(() => {
    const memberIds = new Set(project.memberIds || []);
    return users.filter((u) => memberIds.has(u._id));
  }, [users, project]);

  const membersWithoutOwner = useMemo(
    () =>
      memberUsers.filter((u) => !owner || u._id !== owner._id),
    [memberUsers, owner]
  );

  const invitations = useMemo(
    () => (Array.isArray(project.invitations) ? project.invitations : []),
    [project]
  );

  const [inviteEmail, setInviteEmail] = useState('');

  const handleAdd = () => {
    if (!inviteEmail || !inviteEmail.trim()) return;
    onAddMember && onAddMember(inviteEmail.trim());
    setInviteEmail('');
  };

  const renderInvitation = (inv) => {
    const created = inv.createdAt ? dayjs(inv.createdAt) : null;
    const expires = created ? created.add(7, 'day') : null;
    const now = dayjs();
    const isExpired = expires ? expires.isBefore(now) : false;

    return (
      <List.Item
        key={inv.token}
        actions={
          canManageMembers
            ? [
                <Popconfirm
                  key="revoke"
                  title="Отозвать приглашение?"
                  okText="Да"
                  cancelText="Нет"
                  onConfirm={() =>
                    onRevokeInvite && onRevokeInvite(inv.token)
                  }
                >
                  <Button type="link" size="small" danger>
                    Отозвать
                  </Button>
                </Popconfirm>,
              ]
            : []
        }
      >
        <List.Item.Meta
          title={
            <span>
              {inv.email}{' '}
              <Tag
                color={isExpired ? 'error' : 'default'}
                style={{ marginLeft: 4 }}
              >
                {isExpired ? 'срок истёк' : 'приглашение отправлено'}
              </Tag>
            </span>
          }
          description={
            <div className="project-members-invite-meta">
              {created && (
                <span>
                  Отправлено: {created.format('DD.MM.YYYY')}
                </span>
              )}
              {expires && (
                <span>
                  {' '}
                  · Действительно до:{' '}
                  {expires.format('DD.MM.YYYY')}
                </span>
              )}
              {!created && (
                <Text type="secondary">
                  Информация о дате приглашения недоступна
                </Text>
              )}
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <Card
      size="small"
      className="project-members-card"
      title="Участники проекта"
    >
      <div className="project-members-owner">
        <Text strong>Владелец:</Text>
        {owner ? (
          <span className="project-members-owner-info">
            <Avatar size="small">
              {owner.name?.charAt(0) || '?'}
            </Avatar>
            <Text style={{ marginLeft: 8 }}>{owner.name}</Text>
          </span>
        ) : (
          <Text type="secondary" style={{ marginLeft: 8 }}>
            не найден
          </Text>
        )}
      </div>

      <div className="project-members-list">
        <Text strong>Участники:</Text>
        {membersWithoutOwner.length ? (
          <List
            size="small"
            dataSource={membersWithoutOwner}
            renderItem={(user) => (
              <List.Item
                className="project-members-list-item"
                actions={
                  canManageMembers
                    ? [
                        <Popconfirm
                          key="remove"
                          title="Удалить участника из проекта?"
                          okText="Да"
                          cancelText="Нет"
                          onConfirm={() =>
                            onRemoveMember && onRemoveMember(user._id)
                          }
                        >
                          <Button type="link" size="small" danger>
                            Удалить
                          </Button>
                        </Popconfirm>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar size="small">
                      {user.name?.charAt(0) || '?'}
                    </Avatar>
                  }
                  title={user.name}
                  description={user.email}
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="project-members-empty">
            <Text type="secondary">
              Пока только владелец проекта
            </Text>
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="project-members-invites">
          <Text strong>Приглашения:</Text>
          <List
            size="small"
            dataSource={invitations}
            renderItem={renderInvitation}
          />
        </div>
      )}

      {canManageMembers && (
        <div className="project-members-add">
          <Input
            placeholder="Email пользователя"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <Button
            type="primary"
            onClick={handleAdd}
            disabled={!inviteEmail || !inviteEmail.trim()}
          >
            Добавить по email
          </Button>
        </div>
      )}
    </Card>
  );
}

export default ProjectMembers;
