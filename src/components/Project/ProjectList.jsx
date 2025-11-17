import React, { useMemo } from 'react';
import { List, Typography, Tag, Button } from 'antd';
import './ProjectList.css';

const { Text, Title } = Typography;

function ProjectList({
  projects,
  currentUser,
  currentProjectId,
  onSelectProject,
  onChangeStatus,
}) {
  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status !== 'completed')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [projects]
  );

  const completedProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'completed')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [projects]
  );

  const canManage = (project) =>
    currentUser &&
    (currentUser.isAdmin || project.ownerId === currentUser._id);

  const renderItem = (project, isCompleted) => {
    const isCurrent = currentProjectId === project._id;
    const roleLabel =
      currentUser && (currentUser.isAdmin || project.ownerId === currentUser._id)
        ? 'Владелец/админ'
        : 'Участник';

    const actions = [];
    if (canManage(project) && !isCompleted) {
      actions.push(
        <Button
          key="complete"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onChangeStatus && onChangeStatus(project._id, 'completed');
          }}
        >
          В завершённые
        </Button>
      );
    }
    if (canManage(project) && isCompleted) {
      actions.push(
        <Button
          key="restore"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onChangeStatus && onChangeStatus(project._id, 'active');
          }}
        >
          В активные
        </Button>
      );
    }

    return (
      <List.Item
        key={project._id}
        className={`project-list-item${
          isCurrent ? ' project-list-item--current' : ''
        }${isCompleted ? ' project-list-item--completed' : ''}`}
        actions={actions}
        onClick={() => {
          if (!isCompleted && onSelectProject) {
            onSelectProject(project._id);
          }
        }}
      >
        <List.Item.Meta
          title={
            <span>
              {project.name}
              {isCurrent && !isCompleted && (
                <Tag color="blue" style={{ marginLeft: 6 }}>
                  Текущий
                </Tag>
              )}
              {isCompleted && (
                <Tag color="default" style={{ marginLeft: 6 }}>
                  Завершён
                </Tag>
              )}
            </span>
          }
          description={
            <>
              {project.description && (
                <div className="project-list-desc">
                  {project.description}
                </div>
              )}
              <div className="project-list-meta">
                <Text type="secondary">Роль: {roleLabel}</Text>
              </div>
            </>
          }
        />
      </List.Item>
    );
  };

  return (
    <div className="project-list-root">
      <div className="project-list-section">
        <Title level={5}>Активные проекты</Title>
        {activeProjects.length ? (
          <List
            size="small"
            dataSource={activeProjects}
            renderItem={(p) => renderItem(p, false)}
          />
        ) : (
          <Text type="secondary">Нет активных проектов</Text>
        )}
      </div>

      <div className="project-list-section">
        <Title level={5}>Завершённые проекты</Title>
        {completedProjects.length ? (
          <List
            size="small"
            dataSource={completedProjects}
            renderItem={(p) => renderItem(p, true)}
          />
        ) : (
          <Text type="secondary">Нет завершённых проектов</Text>
        )}
      </div>
    </div>
  );
}

export default ProjectList;
