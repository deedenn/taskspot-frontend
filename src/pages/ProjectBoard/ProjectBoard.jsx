import React, { useMemo, useState } from 'react';
import { Row, Col, Card, Tag, Input, Select } from 'antd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { STATUS_META } from '../../constants/statusMeta';
import './ProjectBoard.css';

const { Search } = Input;

function ProjectBoard({
  tasks,
  categories,
  projectUsers,
  onTaskStatusChange,
  onTaskClick,
}) {
  const [filters, setFilters] = useState({
    search: '',
    categoryIds: [],
    assigneeId: null,
  });

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c._id,
  }));

  const assigneeOptions = projectUsers.map((u) => ({
    label: `${u.name} (${u.email})`,
    value: u._id,
  }));

  const filteredTasks = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const hasSearch = !!search;
    const hasCategories = filters.categoryIds.length > 0;
    const hasAssignee = !!filters.assigneeId;

    return tasks.filter((task) => {
      if (hasSearch) {
        const title = task.title?.toLowerCase() || '';
        const desc = task.description?.toLowerCase() || '';
        if (!title.includes(search) && !desc.includes(search)) {
          return false;
        }
      }

      if (hasCategories) {
        const taskCatIds = (task.categories || []).map((c) => c._id);
        const hasIntersection = filters.categoryIds.some((catId) =>
          taskCatIds.includes(catId)
        );
        if (!hasIntersection) return false;
      }

      if (hasAssignee) {
        const a = task.assignee;
        const assigneeId = typeof a === 'string' ? a : a?._id;
        if (!assigneeId || assigneeId !== filters.assigneeId) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  const tasksByStatus = useMemo(() => {
    const grouped = {};
    Object.keys(STATUS_META).forEach((s) => {
      grouped[s] = [];
    });
    filteredTasks.forEach((task) => {
      const s = task.status || STATUS_META.open.key;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const columnOrder = useMemo(() => Object.keys(STATUS_META), []);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    if (sourceStatus === destStatus) return;

    onTaskStatusChange(draggableId, destStatus);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleCategoryChange = (value) => {
    setFilters((prev) => ({ ...prev, categoryIds: value }));
  };

  const handleAssigneeChange = (value) => {
    setFilters((prev) => ({ ...prev, assigneeId: value || null }));
  };

  return (
    <div className="project-board">
      <div className="project-board-filters">
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Поиск по названию или описанию"
              allowClear
              value={filters.search}
              onChange={handleSearchChange}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              mode="multiple"
              allowClear
              options={categoryOptions}
              placeholder="Фильтр по категориям"
              value={filters.categoryIds}
              onChange={handleCategoryChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              options={assigneeOptions}
              placeholder="Фильтр по исполнителю"
              value={filters.assigneeId}
              onChange={handleAssigneeChange}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </Col>
        </Row>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Row gutter={16} className="project-board-row">
          {columnOrder.map((statusKey) => {
            const meta = STATUS_META[statusKey];
            const tasksInColumn = tasksByStatus[statusKey] || [];

            return (
              <Col
                key={meta.key}
                xs={24}
                sm={12}
                md={12}
                lg={6}
                className="project-board-col"
              >
                <Droppable droppableId={meta.key}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      title={
                        <span className="project-board-column-title">
                          {meta.label}
                          <Tag
                            color={meta.color}
                            className="project-board-column-count"
                          >
                            {tasksInColumn.length}
                          </Tag>
                        </span>
                      }
                      className={`project-board-column ${
                        snapshot.isDraggingOver
                          ? 'project-board-column--drag-over'
                          : ''
                      }`}
                    >
                      {tasksInColumn.length ? (
                        tasksInColumn.map((task, index) => (
                          <Draggable
                            key={task._id}
                            draggableId={task._id}
                            index={index}
                          >
                            {(providedDraggable, snapshotDraggable) => (
                              <Card
                                size="small"
                                className={`project-board-task-card ${
                                  snapshotDraggable.isDragging
                                    ? 'project-board-task-card--dragging'
                                    : ''
                                }`}
                                hoverable
                                onClick={() => onTaskClick && onTaskClick(task)}
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                              >
                                <div className="project-board-task-title">
                                  {task.title}
                                </div>
                                {task.awaitingConfirmation && (
                                  <Tag
                                    color="processing"
                                    className="project-board-task-flag"
                                  >
                                    Ждёт подтверждения
                                  </Tag>
                                )}
                                {task.categories?.length > 0 && (
                                  <div className="project-board-task-categories">
                                    {task.categories.map((cat) => (
                                      <Tag
                                        key={cat._id}
                                        color={cat.color || 'blue'}
                                        className="project-board-task-category-tag"
                                      >
                                        {cat.name}
                                      </Tag>
                                    ))}
                                  </div>
                                )}
                              </Card>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <div className="project-board-column-empty">
                          Нет задач
                        </div>
                      )}

                      {provided.placeholder}
                    </Card>
                  )}
                </Droppable>
              </Col>
            );
          })}
        </Row>
      </DragDropContext>
    </div>
  );
}

export default ProjectBoard;
