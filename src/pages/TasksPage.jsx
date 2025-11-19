import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import {
  PlusOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
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

const { Option } = Select;
const { Text, Title } = Typography;

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

export default function TasksPage({
  currentUser,
  projects,
  currentProject,
  setCurrentProjectId,
  viewKey,
}) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const [viewMode, setViewMode] = useState('list'); // list | board
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [filterCategoryId, setFilterCategoryId] = useState(undefined);
  const [filterAssigneeId, setFilterAssigneeId] = useState(undefined);

  const canManageCategories = useMemo(
    () =>
      !!currentProject &&
      (currentUser?.isAdmin || currentProject.ownerId === currentUser?.id),
    [currentProject, currentUser]
  );

  const getCategoryById = useCallback(
    (id) => categories.find((c) => c._id === id),
    [categories]
  );

  const assignees = members;

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
      const data = await getTaskHistoryApi(task._id);
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTaskSubmit = async () => {
    if (!currentProject) return;
    try {
      const values = await taskForm.validateFields();
      const payload = {
        projectId: currentProject._id,
        title: values.title,
        description: values.description,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        categoryIds: values.categoryIds || [],
        assigneeId: values.assigneeId || undefined,
      };

      if (taskModalMode === 'create') {
        const created = await createTaskApi(payload);
        setTasks((prev) => [created, ...prev]);
        message.success('Задача создана');
      } else if (taskModalMode === 'edit' && currentTask) {
        const updated = await updateTaskApi(currentTask._id, payload);
        setTasks((prev) => prev.map((t) => (t._id === currentTask._id ? updated : t)));
        message.success('Задача обновлена');
      }

      setTaskModalOpen(false);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || 'Не удалось сохранить задачу');
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      const updated = await updateTaskStatusApi(task._id, status);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
      message.success('Статус обновлён');
    } catch (e) {
      message.error(e.message || 'Не удалось изменить статус');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchText) {
        const s = searchText.toLowerCase();
        if (
          !(
            t.title?.toLowerCase().includes(s) ||
            t.description?.toLowerCase().includes(s)
          )
        ) {
          return false;
        }
      }
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterCategoryId) {
        if (!Array.isArray(t.categoryIds) || !t.categoryIds.includes(filterCategoryId)) {
          return false;
        }
      }
      if (filterAssigneeId) {
        if (t.assigneeId !== filterAssigneeId) return false;
      }
      return true;
    });
  }, [tasks, searchText, filterStatus, filterCategoryId, filterAssigneeId]);

  const tasksByStatus = useMemo(() => {
    const groups = {
      open: [],
      in_progress: [],
      done: [],
      closed: [],
    };
    filteredTasks.forEach((t) => {
      if (!groups[t.status]) {
        groups[t.status] = [];
      }
      groups[t.status].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const columns = useMemo(
    () => [
      {
        title: 'Название',
        dataIndex: 'title',
        key: 'title',
        render: (text, record) => (
          <a onClick={() => openDetailDrawer(record)}>{text}</a>
        ),
      },
      {
        title: 'Срок',
        dataIndex: 'dueDate',
        key: 'dueDate',
        render: (value) =>
          value ? dayjs(value).format('DD.MM.YYYY') : <Text type="secondary">нет</Text>,
      },
      {
        title: 'Категории',
        dataIndex: 'categoryIds',
        key: 'categories',
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
        key: 'status',
        render: (value) => (
          <Tag color={STATUS_COLORS[value] || 'default'}>
            {STATUS_LABELS[value] || value}
          </Tag>
        ),
      },
      {
        title: 'Исполнитель',
        dataIndex: 'assigneeId',
        key: 'assignee',
        render: (value) =>
          assignees.find((u) => u._id === value)?.name || (
            <Text type="secondary">не назначен</Text>
          ),
      },
    ],
    [assignees, getCategoryById]
  );

  const renderBoard = () => (
    <Row gutter={[8, 8]}>
      {['open', 'in_progress', 'done', 'closed'].map((statusKey) => (
        <Col key={statusKey} xs={24} md={6}>
          <Card
            size="small"
            title={STATUS_LABELS[statusKey]}
            headStyle={{ fontSize: 13 }}
            bodyStyle={{ padding: 8 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {tasksByStatus[statusKey]?.map((task) => (
                <Card
                  key={task._id}
                  size="small"
                  hoverable
                  onClick={() => openDetailDrawer(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {task.title}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {Array.isArray(task.categoryIds) &&
                          task.categoryIds.map((cid) => {
                            const cat = getCategoryById(cid);
                            if (!cat) return null;
                            return (
                              <Tag
                                key={cid}
                                color={cat.color || 'default'}
                                style={{ marginBottom: 4 }}
                              >
                                {cat.name}
                              </Tag>
                            );
                          })}
                      </div>
                    </div>
                    {task.dueDate && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        {dayjs(task.dueDate).format('DD.MM')}
                      </Text>
                    )}
                  </div>
                </Card>
              ))}
              {(!tasksByStatus[statusKey] || tasksByStatus[statusKey].length === 0) && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Нет задач
                </Text>
              )}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const projectOptions = projects || [];

  return (
    <div>
      <Row
        gutter={[8, 8]}
        className="tasks-filters-row"
        style={{ marginBottom: 12 }}
      >
        <Col xs={24} md={8}>
          <div
            className="filters-inline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <Input.Search
              placeholder="Поиск по названию и описанию"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
              size="middle"
            />
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode('list')}
              size="middle"
            />
            <Button
              type={viewMode === 'board' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('board')}
              size="middle"
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <Select
            allowClear
            placeholder="Фильтр по статусу"
            style={{ width: '100%' }}
            value={filterStatus}
            onChange={setFilterStatus}
            size="middle"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <div
            className="filters-inline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <Select
              allowClear
              placeholder="Фильтр по категории"
              style={{ flex: 1 }}
              value={filterCategoryId}
              onChange={setFilterCategoryId}
              size="middle"
            >
              {categories.map((cat) => (
                <Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
            {canManageCategories && currentProject && (
              <Button
                size="middle"
                type="primary"
                onClick={() => {
                  categoryForm.resetFields();
                  categoryForm.setFieldsValue({ color: CATEGORY_COLORS[0] });
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
            size="middle"
          >
            {assignees.map((u) => (
              <Option key={u._id} value={u._id}>
                {u.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadTasksAndMeta}
            block
            size="middle"
          >
            Обновить
          </Button>
        </Col>
        <Col xs={24} md={8}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            block
            size="middle"
            disabled={!currentProject}
          >
            Новая задача
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div
          style={{
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin />
        </div>
      ) : viewMode === 'list' ? (
        <Card size="small">
          <Table
            dataSource={filteredTasks}
            columns={columns}
            rowKey="_id"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        </Card>
      ) : (
        renderBoard()
      )}

      <Modal
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={handleTaskSubmit}
        title={taskModalMode === 'create' ? 'Новая задача' : 'Редактирование задачи'}
        okText={taskModalMode === 'create' ? 'Создать' : 'Сохранить'}
        destroyOnClose
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
          <Form.Item label="Срок" name="dueDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Категории" name="categoryIds">
            <Select
              mode="multiple"
              placeholder="Выберите категории"
              optionFilterProp="children"
            >
              {categories.map((cat) => (
                <Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Исполнитель" name="assigneeId">
            <Select
              allowClear
              placeholder="Назначить исполнителя"
              optionFilterProp="children"
            >
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
        destroyOnClose
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
        title={detailTask ? detailTask.title : 'Задача'}
        width={480}
        destroyOnClose
      >
        {detailTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions
              column={1}
              size="small"
              labelStyle={{ width: 120 }}
              colon={false}
            >
              <Descriptions.Item label="Статус">
                <Tag color={STATUS_COLORS[detailTask.status] || 'default'}>
                  {STATUS_LABELS[detailTask.status] || detailTask.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Срок">
                {detailTask.dueDate ? (
                  dayjs(detailTask.dueDate).format('DD.MM.YYYY')
                ) : (
                  <Text type="secondary">нет</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Категории">
                {Array.isArray(detailTask.categoryIds) &&
                detailTask.categoryIds.length > 0 ? (
                  detailTask.categoryIds.map((cid) => {
                    const cat = getCategoryById(cid);
                    if (!cat) return null;
                    return (
                      <Tag key={cid} color={cat.color || 'default'}>
                        {cat.name}
                      </Tag>
                    );
                  })
                ) : (
                  <Text type="secondary">нет</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Исполнитель">
                {detailTask.assigneeId
                  ? assignees.find((u) => u._id === detailTask.assigneeId)?.name ||
                    detailTask.assigneeId
                  : (
                    <Text type="secondary">не назначен</Text>
                    )}
              </Descriptions.Item>
              <Descriptions.Item label="Описание">
                {detailTask.description ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{detailTask.description}</div>
                ) : (
                  <Text type="secondary">нет</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Действия со статусом">
              <Space wrap>
                {detailTask.status !== 'open' && (
                  <Button onClick={() => handleStatusChange(detailTask, 'open')}>
                    Открыта
                  </Button>
                )}
                {detailTask.status !== 'in_progress' && (
                  <Button onClick={() => handleStatusChange(detailTask, 'in_progress')}>
                    В работе
                  </Button>
                )}
                {detailTask.status !== 'done' && (
                  <Button onClick={() => handleStatusChange(detailTask, 'done')}>
                    Выполнено
                  </Button>
                )}
                {detailTask.status !== 'closed' && (
                  <Button onClick={() => handleStatusChange(detailTask, 'closed')}>
                    Закрыта
                  </Button>
                )}
              </Space>
            </Card>

            <Card size="small" title="История изменений">
              {historyLoading ? (
                <Spin />
              ) : history.length === 0 ? (
                <Text type="secondary">История пока пустая</Text>
              ) : (
                <Timeline
                  items={history.map((h) => ({
                    children: (
                      <div>
                        <div>{h.message}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          {h.user?.name || 'Система'} ·{' '}
                          {dayjs(h.createdAt).format('DD.MM.YYYY HH:mm')}
                        </div>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
