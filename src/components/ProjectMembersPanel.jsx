import React, { useEffect, useState } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Typography,
  Popconfirm,
  Input,
  Tag,
  message,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import {
  fetchProjectMembersApi,
  addMemberApi,
  removeMemberApi,
  revokeInviteApi,
} from '../api/projects';

const { Text } = Typography;

function ProjectMembersPanel({ project }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');

  const loadMembers = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const data = await fetchProjectMembersApi(project._id);
      setOwnerId(data.ownerId);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (e) {
      console.error(e);
      message.error('Не удалось загрузить участников проекта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?._id]);

  const handleAdd = async () => {
    if (!inviteEmail) return;
    try {
      await addMemberApi(project._id, inviteEmail.trim());
      message.success('Приглашение отправлено (или пользователь добавлен)');
      setInviteEmail('');
      loadMembers();
    } catch (e) {
      message.error(e.message || 'Не удалось добавить участника');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeMemberApi(project._id, userId);
      message.success('Участник удалён');
      loadMembers();
    } catch (e) {
      message.error(e.message || 'Не удалось удалить участника');
    }
  };

  const handleRevoke = async (token) => {
    try {
      await revokeInviteApi(project._id, token);
      message.success('Приглашение отозвано');
      loadMembers();
    } catch (e) {
      message.error(e.message || 'Не удалось отозвать приглашение');
    }
  };

  const owner = members.find((m) => m._id === ownerId) || null;
  const otherMembers = members.filter((m) => m._id !== ownerId);

  return (
    <Card
      size="small"
      title="Участники проекта"
      loading={loading}
      style={{ marginTop: 16 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong>Владелец: </Text>
        {owner ? (
          <Space size={8}>
            <Avatar size="small">
              {owner.name?.charAt(0) || '?'}
            </Avatar>
            <Text>{owner.name}</Text>
            <Text type="secondary">{owner.email}</Text>
          </Space>
        ) : (
          <Text type="secondary">не найден</Text>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Участники:</Text>
        {otherMembers.length === 0 ? (
          <div>
            <Text type="secondary">Пока только владелец проекта</Text>
          </div>
        ) : (
          <List
            size="small"
            dataSource={otherMembers}
            renderItem={(user) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="remove"
                    title="Удалить участника из проекта?"
                    okText="Да"
                    cancelText="Нет"
                    onConfirm={() => handleRemove(user._id)}
                  >
                    <Button type="link" size="small" danger>
                      Удалить
                    </Button>
                  </Popconfirm>,
                ]}
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
        )}
      </div>

      {invitations.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text strong>Приглашения:</Text>
          <List
            size="small"
            dataSource={invitations}
            renderItem={(inv) => {
              const created = inv.createdAt
                ? dayjs(inv.createdAt)
                : null;
              const expires = created
                ? created.add(7, 'day')
                : null;
              const isExpired = expires
                ? expires.isBefore(dayjs())
                : false;
              return (
                <List.Item
                  key={inv.token}
                  actions={[
                    <Popconfirm
                      key="revoke"
                      title="Отозвать приглашение?"
                      okText="Да"
                      cancelText="Нет"
                      onConfirm={() => handleRevoke(inv.token)}
                    >
                      <Button type="link" size="small" danger>
                        Отозвать
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <>
                        {inv.email}{' '}
                        <Tag color={isExpired ? 'error' : 'default'}>
                          {isExpired ? 'срок истёк' : 'приглашение отправлено'}
                        </Tag>
                      </>
                    }
                    description={
                      <span style={{ fontSize: 12 }}>
                        {created && (
                          <>
                            Отправлено:{' '}
                            {created.format('DD.MM.YYYY')}
                          </>
                        )}
                        {expires && (
                          <>
                            {' '}
                            · Действительно до:{' '}
                            {expires.format('DD.MM.YYYY')}
                          </>
                        )}
                      </span>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 8,
        }}
      >
        <Input
          placeholder="Email пользователя"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          style={{ minWidth: 220, flex: 1 }}
        />
        <Button
          type="primary"
          onClick={handleAdd}
          disabled={!inviteEmail}
        >
          Добавить по email
        </Button>
      </div>
    </Card>
  );
}

export default ProjectMembersPanel;
