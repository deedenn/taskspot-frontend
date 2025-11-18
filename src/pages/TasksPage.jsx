import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Spin,
  Drawer,
  Timeline,
  Descriptions,
  Radio,
} from 'antd';
import dayjs from 'dayjs';
import {
  fetchTasksApi,
  createTaskApi,
  updateTaskApi,
  updateTaskStatusApi,
  getTaskHistoryApi,
} from '../api/tasks';
import { fetchCategoriesApi, createCategoryApi } from '../api/categories';
import { fetchProjectMembersApi } from '../api/projects';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_LABELS = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Выполнено',
  closed: 'Закрыта',
};

const STATUS_COLORS = {
  open: 'default',
  in_progress: 'processing',
  done: 'success',
  closed: 'default',
};

const CATEGORY_COLORS = [
  '#1677ff',
  '#13c2c2',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#eb2f96',
  '#2f54eb',
  '#a0d911',
  '#fa8c16',
];


function TasksPage({ currentUser, projects, currentProject, setCurrentProjectId, viewKey }) {
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list | board
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [filterCategoryId, setFilterCategoryId] = useState(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState('create'); // create | edit
  const [currentTask, setCurrentTask] = useState(null);
  const [taskForm] = Form.useForm();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm] = Form.useForm();


  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const getUserById = useCallback(
    (id) => members.find((u) => u._id === id),
    [members]
  );

  const getCategoryById = useCallback(
    (id) => categories.find((c) => c._id === id),
    [categories]
  );

  const canManageCategories = useMemo(
    () =>
      !!currentProject &&
      (currentUser?.isAdmin || currentProject.ownerId === currentUser?.id),
    [currentProject, currentUser]
  );

  const loadTasksAndMeta = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const query = {
        projectId: currentProject._id,
      };

      if (viewKey === 'assigned') {
        query.role = 'assigned';
      } else if (viewKey === 'mine') {
        query.role = 'mine';
      } else if (viewKey === 'overdue') {
        query.role = 'assigned';
        query.overdue = true;
      }

      const [tasksData, catsData, membersData] = await Promise.all([
        fetchTasksApi(query),
        fetchCategoriesApi(currentProject._id),
        fetchProjectMembersApi(currentProject._id),
      ]);
      setTasks(tasksData);
      setCategories(catsData);
      setMembers(membersData.members || []);
    } catch (e) {
      console.error(e);
      message.error('Не удалось загрузить задачи или метаданные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksAndMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?._id, viewKey]);

  const handleProjectChange = (projectId) => {
    setCurrentProjectId(projectId);
  };

  const assignees = useMemo(() => {
    return members;
  }, [members]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) =>
        filterCategoryId
          ? (t.categoryIds || []).includes(filterCategoryId)
          : true
      )
      .filter((t) =>
        filterAssigneeId ? t.assigneeId === filterAssigneeId : true
      )
      .filter((t) =>
        searchText
          ? t.title.toLowerCase().includes(searchText.toLowerCase())
          : true
      )
      .sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
  }, [tasks, filterCategoryId, filterAssigneeId, searchText]);

  const openCreateModal = () => {
    setTaskModalMode('create');
    setCurrentTask(null);
    taskForm.resetFields();
    setTaskModalOpen(true);
  };

  const openEditModal = (task) => {
    setTaskModalMode('edit');
    setCurrentTask(task);
    taskForm.setFieldsValue({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      categoryIds: task.categoryIds || [],
      assigneeId: task.assigneeId || null,
    });
    setTaskModalOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!currentProject) return;
    try {
      const values = await categoryForm.validateFields();
      const payload = {
        projectId: currentProject._id,
        name: values.name,
        color: values.color || undefined,
      };
      const created = await createCategoryApi(payload);
      setCategories((prev) => [...prev, created]);
      message.success('Категория создана');
      setCategoryModalOpen(false);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось создать категорию');
    }
  };

  const openDetailDrawer = async (task) => {
    setDetailTask(task);
    setDetailDrawerOpen(true);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const historyData = await getTaskHistoryApi(task._id);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (e) {
      // история не критична для работы задач, покажем сообщение и продолжим
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEditFromDetail = () => {
    if (!detailTask) return;
    openEditModal(detailTask);
  };


  const handleTaskSubmit = async () => {
    try {
      const values = await taskForm.validateFields();
      const payload = {
        projectId: currentProject._id,
        title: values.title,
        description: values.description || '',
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        categoryIds: values.categoryIds || [],
        assigneeId: values.assigneeId || null,
        watcherIds: [],
      };
      if (taskModalMode === 'create') {
        const created = await createTaskApi(payload);
        setTasks((prev) => [...prev, created]);
        message.success('Задача создана');
      } else if (taskModalMode === 'edit' && currentTask) {
        const updated = await updateTaskApi(currentTask._id, payload);
        setTasks((prev) =>
          prev.map((t) => (t._id === currentTask._id ? updated : t))
        );
        message.success('Задача обновлена');
      }
      setTaskModalOpen(false);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось сохранить задачу');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const updated = await updateTaskStatusApi(task._id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? updated : t))
      );
      message.success('Статус задачи обновлён');
    } catch (e) {
      message.error(e.message || 'Не удалось обновить статус');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      render: (text, record) => (
        <a onClick={() => openDetailDrawer(record)}>{text}</a>
      ),
    },
    {
      title: 'Срок',
      dataIndex: 'dueDate',
      render: (value) =>
        value ? dayjs(value).format('DD.MM.YYYY') : <Text type="secondary">нет</Text>,
    },
    {
      title: 'Категории',
      dataIndex: 'categoryIds',
      render: (value, record) =>
        Array.isArray(record.categoryIds) && record.categoryIds.length > 0 ? (
          <Space wrap size={4}>
            {record.categoryIds.map((cid) => {
              const cat = getCategoryById(cid);
              if (!cat) return null;
              return (
                <Tag key={cid} color={cat.color || 'default'}>
                  {cat.name}
                </Tag>
              );
            })}
          </Space>
        ) : (
          <Text type="secondary">нет</Text>
        ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={STATUS_COLORS[value] || 'default'}>
          {STATUS_LABELS[value] || value}
        </Tag>
      ),
    },
    {
      title: 'Исполнитель',
      dataIndex: 'assigneeId',
      render: (value) =>
        assignees.find((u) => u._id === value)?.name || (
          <Text type="secondary">не назначен</Text>
        ),
    },
  ];

  const boardColumns = ['open', 'in_progress', 'done', 'closed'];

  const tasksByStatus = useMemo(() => {
    const map = {};
    boardColumns.forEach((s) => {
      map[s] = [];
    });
    filteredTasks.forEach((t) => {
      const key = t.status || 'open';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="Задачи"
            extra={
              <Space>
                <Select
                  style={{ minWidth: 200 }}
                  placeholder="Выберите проект"
                  value={currentProject?._id}
                  onChange={handleProjectChange}
                >
                  {projects.map((p) => (
                    <Option key={p._id} value={p._id}>
                      {p.name}
                    </Option>
                  ))}
                </Select>
                <Select
                  style={{ minWidth: 140 }}
                  value={viewMode}
                  onChange={setViewMode}
                >
                  <Option value="list">Список</Option>
                  <Option value="board">Доска</Option>
                </Select>
                <Button type="primary" onClick={openCreateModal}>
                  Новая задача
                </Button>
              </Space>
            }
          >
            {!currentProject ? (
              <Text>Создайте или выберите проект, чтобы работать с задачами.</Text>
            ) : loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 32,
                }}
              >
                <Spin />
              </div>
            ) : (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={8}>
                    <Input
                      placeholder="Поиск по названию"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Select
                        allowClear
                        placeholder="Фильтр по категории"
                        style={{ flex: 1 }}
                        value={filterCategoryId}
                        onChange={setFilterCategoryId}
                      >
                        {categories.map((cat) => (
                          <Option key={cat._id} value={cat._id}>
                            {cat.name}
                          </Option>
                        ))}
                      </Select>
                      {canManageCategories && currentProject && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            categoryForm.resetFields();
                            setCategoryModalOpen(true);
                          }}
                        >
                          +
                        </Button>
                      )}
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Select
                      allowClear
                      placeholder="Фильтр по исполнителю"
                      style={{ width: '100%' }}
                      value={filterAssigneeId}
                      onChange={setFilterAssigneeId}
                    >
                      {assignees.map((u) => (
                        <Option key={u._id} value={u._id}>
                          {u.name}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
                {viewMode === 'list' ? (
                  <Table
                    size="small"
                    rowKey="_id"
                    columns={columns}
                    dataSource={filteredTasks}
                    pagination={{ pageSize: 10 }}
                  />
                ) : (
                  <Row gutter={[16, 16]}>
                    {boardColumns.map((statusKey) => (
                      <Col xs={24} md={6} key={statusKey}>
                        <Card
                          size="small"
                          title={STATUS_LABELS[statusKey]}
                          extra={
                            <Tag color={STATUS_COLORS[statusKey]}>
                              {tasksByStatus[statusKey]?.length || 0}
                            </Tag>
                          }
                          style={{ minHeight: 200 }}
                        >
                          <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                          >
                            {tasksByStatus[statusKey]?.map((task) => (
                              <Card
                                key={task._id}
                                size="small"
                                hoverable
                                onClick={() => openDetailDrawer(task)}
                              >
                                <Title level={5} style={{ marginBottom: 4 }}>
                                  {task.title}
                                </Title>
                                {task.dueDate && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Срок:{' '}
                                    {dayjs(task.dueDate).format('DD.MM.YYYY')}
                                  </Text>
                                )}
                                <div style={{ marginTop: 8 }}>
                                  {statusKey !== 'open' && (
                                    <Button
                                      size="small"
                                      type="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(task, 'open');
                                      }}
                                    >
                                      В открытые
                                    </Button>
                                  )}
                                  {statusKey !== 'in_progress' && (
                                    <Button
                                      size="small"
                                      type="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(
                                          task,
                                          'in_progress'
                                        );
                                      }}
                                    >
                                      В работу
                                    </Button>
                                  )}
                                  {statusKey !== 'done' && (
                                    <Button
                                      size="small"
                                      type="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(task, 'done');
                                      }}
                                    >
                                      Выполнено
                                    </Button>
                                  )}
                                  {statusKey !== 'closed' && (
                                    <Button
                                      size="small"
                                      type="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(task, 'closed');
                                      }}
                                    >
                                      Закрыть
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            ))}
                            {(!tasksByStatus[statusKey] ||
                              tasksByStatus[statusKey].length === 0) && (
                              <Text type="secondary">Нет задач</Text>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={handleTaskSubmit}
        title={taskModalMode === 'create' ? 'Новая задача' : 'Редактирование задачи'}
        okText="Сохранить"
      >
        <Form layout="vertical" form={taskForm}>
          <Form.Item
            label="Название"
            name="title"
            rules={[{ required: true, message: 'Введите название задачи' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Срок выполнения" name="dueDate">
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) =>
                current && current.startOf('day') < dayjs().startOf('day')
              }
            />
          </Form.Item>
          <Form.Item label="Категории" name="categoryIds">
            <Select
              mode="multiple"
              placeholder="Выберите категории"
              allowClear
            >
              {categories.map((cat) => (
                <Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Исполнитель" name="assigneeId">
            <Select placeholder="Не назначен" allowClear>
              {assignees.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={handleCategorySubmit}
        title="Новая категория"
        okText="Создать"
      >
        <Form layout="vertical" form={categoryForm}>
          <Form.Item
            label="Название категории"
            name="name"
            rules={[{ required: true, message: 'Введите название категории' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Цвет" name="color" initialValue={CATEGORY_COLORS[0]}>
            <Radio.Group>
              <Space wrap>
                {CATEGORY_COLORS.map((col) => (
                  <Radio.Button key={col} value={col}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '999px',
                        backgroundColor: col,
                        border: '1px solid #d9d9d9',
                      }}
                    />
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title={detailTask?.title || 'Карточка задачи'}
        width={640}
        destroyOnClose
        extra={
          detailTask && (
            <Button type="primary" onClick={handleEditFromDetail}>
              Редактировать
            </Button>
          )
        }
      >
        {detailTask && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Space wrap>
                <Tag color={STATUS_COLORS[detailTask.status] || 'default'}>
                  {STATUS_LABELS[detailTask.status] || detailTask.status}
                </Tag>
                {detailTask.dueDate && (
                  <Tag>
                    Срок: {dayjs(detailTask.dueDate).format('DD.MM.YYYY')}
                  </Tag>
                )}
              </Space>
            </div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Инициатор">
                {(() => {
                  const creator = getUserById(detailTask.creatorId);
                  return creator
                    ? `${creator.name} (${creator.email})`
                    : '—';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Исполнитель">
                {(() => {
                  const assignee = getUserById(detailTask.assigneeId);
                  return assignee
                    ? `${assignee.name} (${assignee.email})`
                    : 'Не назначен';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Наблюдатели">
                {Array.isArray(detailTask.watcherIds) &&
                detailTask.watcherIds.length > 0
                  ? detailTask.watcherIds
                      .map((id) => getUserById(id))
                      .filter(Boolean)
                      .map((u) => u.name)
                      .join(', ')
                  : 'Нет'}
              </Descriptions.Item>
              <Descriptions.Item label="Категории">
                {Array.isArray(detailTask.categoryIds) &&
                detailTask.categoryIds.length > 0 ? (
                  <Space wrap>
                    {detailTask.categoryIds.map((cid) => {
                      const cat = getCategoryById(cid);
                      return (
                        <Tag key={cid} color={cat?.color || 'default'}>
                          {cat?.name || 'Категория'}
                        </Tag>
                      );
                    })}
                  </Space>
                ) : (
                  'Нет'
                )}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Title level={5}>Описание</Title>
              <Text>
                {detailTask.description &&
                detailTask.description.trim().length > 0
                  ? detailTask.description
                  : 'Нет описания'}
              </Text>
            </div>
            <div>
              <Title level={5}>История изменений</Title>
              {historyLoading ? (
                <Spin />
              ) : history.length === 0 ? (
                <Text type="secondary">История пока пуста</Text>
              ) : (
                <Timeline
                  items={history.map((item) => ({
                    children: (
                      <div>
                        <Text>{item.message}</Text>
                        <div>
                          {item.user && (
                            <Text
                              type="secondary"
                              style={{ fontSize: 12 }}
                            >
                              {item.user.name} ({item.user.email})
                            </Text>
                          )}
                        </div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {dayjs(item.createdAt).format(
                            'DD.MM.YYYY HH:mm'
                          )}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </div>
          </Space>
        )}
      </Drawer>

    </div>
  );
}

export default TasksPage;
