import { STATUS_META } from '../constants/statusMeta';

export const initialUsers = [
  {
    _id: 'u1',
    name: 'Администратор',
    email: 'admin@example.com',
    password: 'admin',
    isAdmin: true,
  },
  {
    _id: 'u2',
    name: 'Анна',
    email: 'anna@example.com',
    password: 'password',
    isAdmin: false,
  },
  {
    _id: 'u3',
    name: 'Иван',
    email: 'ivan@example.com',
    password: 'password',
    isAdmin: false,
  },
  {
    _id: 'u4',
    name: 'Олег',
    email: 'oleg@example.com',
    password: 'password',
    isAdmin: false,
  },
];

export const initialProjects = [
  {
    _id: 'p1',
    name: 'Внутренний портал',
    description: 'Проект по разработке внутреннего портала компании',
    ownerId: 'u2', // Анна
    memberIds: ['u2', 'u3', 'u4'], // участники проекта
    status: 'active',
    invitations: [],
  },
  {
    _id: 'p2',
    name: 'Маркетинговая кампания',
    description: 'Подготовка материалов для маркетинговой кампании',
    ownerId: 'u3', // Иван
    memberIds: ['u2', 'u3'], // Анна и Иван
    status: 'active',
    invitations: [],
  },
];


export const initialCategories = [
  { _id: 'c1', projectId: 'p1', name: 'Backend', color: '#1677ff' },
  { _id: 'c2', projectId: 'p1', name: 'Frontend', color: '#52c41a' },
  { _id: 'c3', projectId: 'p1', name: 'Дизайн', color: '#faad14' },
  { _id: 'c4', projectId: 'p2', name: 'Реклама', color: '#eb2f96' },
  { _id: 'c5', projectId: 'p2', name: 'Контент', color: '#13c2c2' },
];

export const initialTasks = [
  {
    _id: 't1',
    projectId: 'p1',
    title: 'Настроить базу данных',
    description: 'Создать схемы и индексы в MongoDB для модуля задач',
    status: STATUS_META.open.key,
    dueDate: '2025-11-20T00:00:00.000Z',
    categories: [initialCategories[0]],
    assignee: initialUsers[2], // Иван
    watchers: [initialUsers[1]], // Анна
    creatorId: 'u2', // создала Анна
    awaitingConfirmation: false,
  },
  {
    _id: 't2',
    projectId: 'p1',
    title: 'Сверстать лендинг',
    description: 'Использовать Ant Design и адаптивную вёрстку',
    status: STATUS_META.in_progress.key,
    dueDate: '2025-11-18T00:00:00.000Z',
    categories: [initialCategories[1], initialCategories[2]],
    assignee: initialUsers[1], // Анна
    watchers: [initialUsers[2], initialUsers[3]], // Иван и Олег
    creatorId: 'u3', // создал Иван
    awaitingConfirmation: false,
  },
  {
    _id: 't3',
    projectId: 'p1',
    title: 'Подготовить макеты дашборда',
    description: 'Продумать сценарии использования и UI для дашборда',
    status: STATUS_META.done.key,
    dueDate: '2025-11-15T00:00:00.000Z',
    categories: [initialCategories[2]],
    assignee: initialUsers[3], // Олег
    watchers: [initialUsers[1]], // Анна
    creatorId: 'u2',
    awaitingConfirmation: true, // пример задачи, ожидающей подтверждения
  },
  {
    _id: 't4',
    projectId: 'p2',
    title: 'Собрать список каналов рекламы',
    description: 'Определить каналы для размещения рекламы и оценить бюджет',
    status: STATUS_META.open.key,
    dueDate: '2025-11-22T00:00:00.000Z',
    categories: [initialCategories[3]],
    assignee: initialUsers[2], // Иван
    watchers: [initialUsers[1]], // Анна
    creatorId: 'u3',
    awaitingConfirmation: false,
  },
  {
    _id: 't5',
    projectId: 'p2',
    title: 'Подготовить контент-план',
    description: 'Составить контент-план на месяц для кампании',
    status: STATUS_META.in_progress.key,
    dueDate: '2025-11-19T00:00:00.000Z',
    categories: [initialCategories[4]],
    assignee: initialUsers[1], // Анна
    watchers: [initialUsers[2]], // Иван
    creatorId: 'u2',
    awaitingConfirmation: false,
  },
];
