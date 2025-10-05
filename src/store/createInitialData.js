import dayjs from 'dayjs';

const genId = () => Math.random().toString(36).slice(2, 9);

export default function createInitialData() {
    const users = [
        { id: genId(), email: 'alice@example.com', name: 'Alice' },
        { id: genId(), email: 'bob@example.com', name: 'Bob' },
        { id: genId(), email: 'carol@example.com', name: 'Carol' },
    ];

    const projects = [
        {
            id: genId(),
            name: 'Website Redesign',
            description: 'Обновление корпоративного сайта',
            ownerId: users[0].id,
            members: [
                { userId: users[0].id, role: 'admin' },
                { userId: users[1].id, role: 'member' },
            ],
            categories: [
                { id: genId(), name: 'Frontend' },
                { id: genId(), name: 'Backend' },
                { id: genId(), name: 'UI/UX' },
            ],
        },
        {
            id: genId(),
            name: 'Mobile App',
            description: 'MVP мобильного приложения',
            ownerId: users[1].id,
            members: [
                { userId: users[1].id, role: 'admin' },
                { userId: users[2].id, role: 'member' },
            ],
            categories: [
                { id: genId(), name: 'API' },
                { id: genId(), name: 'QA' },
            ],
        },
    ];

    const tasks = [
        {
            id: genId(),
            projectId: projects[0].id,
            title: 'Сверстать главную',
            description: 'Секция hero + преимущества',
            dueDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
            categories: [projects[0].categories[0].id],
            assigneeId: users[1].id,
            watcherIds: [users[0].id],
            status: 'in_progress',
            createdBy: users[0].id,
            attachments: [],
            comments: [
                { id: genId(), taskId: '', authorId: users[0].id, body: 'Стартуем сегодня', createdAt: new Date().toISOString() },
            ],
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        },
        {
            id: genId(),
            projectId: projects[1].id,
            title: 'Поднять auth endpoint',
            description: 'JWT + refresh',
            dueDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
            categories: [projects[1].categories[0].id],
            assigneeId: users[2].id,
            watcherIds: [users[1].id],
            status: 'open',
            createdBy: users[1].id,
            attachments: [{ filename: 'spec-auth-v1.md' }],
            comments: [],
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        },
    ];
    tasks[0].comments[0].taskId = tasks[0].id;
    return { users, projects, tasks };
}