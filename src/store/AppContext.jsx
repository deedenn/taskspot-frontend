import React, { createContext, useContext, useMemo, useState } from 'react';
import { message } from 'antd';
import createInitialData from './createInitialData';

export const statusLabels = {
    open: 'открыта',
    in_progress: 'в работе',
    done: 'выполнено',
    closed: 'закрыта',
};
const allowedTransitions = {
    open: ['in_progress'],
    in_progress: ['done', 'open'],
    done: ['in_progress', 'closed'],
    closed: [],
};

const AppCtx = createContext(null);
export const useApp = () => {
    const ctx = useContext(AppCtx);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};

const genId = () => Math.random().toString(36).slice(2, 9);

export function AppProvider({ children }) {
    const init = useMemo(() => createInitialData(), []);
    const [users, setUsers] = useState(init.users);
    const [projects, setProjects] = useState(init.projects);
    const [tasks, setTasks] = useState(init.tasks);
    const [currentUserId, setCurrentUserId] = useState('');
    const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || null, [users, currentUserId]);

    const isProjectMember = (p, uid) => p.members.some(m => m.userId === uid);
    const isProjectAdmin = (p, uid) => p.members.some(m => m.userId === uid && m.role === 'admin');

    const register = ({ name, email }) => {
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) { message.error('Email уже зарегистрирован'); return false; }
        const u = { id: genId(), name, email };
        setUsers(prev => [...prev, u]);
        setCurrentUserId(u.id);
        return true;
    };
    const login = (userId) => setCurrentUserId(userId);
    const logout = () => setCurrentUserId('');

    const createProject = ({ name, description }) => {
        if (!currentUser) return;
        const p = { id: genId(), name, description, ownerId: currentUser.id, members: [{ userId: currentUser.id, role: 'admin' }], categories: [] };
        setProjects(prev => [p, ...prev]);
        message.success('Проект создан');
        return p.id;
    };

    const addProjectMember = (projectId, userId, role = 'member') => {
        setProjects(prev => prev.map(p => p.id !== projectId ? p : {
            ...p,
            members: p.members.some(m => m.userId === userId) ? p.members : [...p.members, { userId, role }]
        }));
    };
    const removeProjectMember = (projectId, userId) => {
        setProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, members: p.members.filter(m => m.userId !== userId) }));
        setTasks(prev => prev.map(t => t.projectId !== projectId ? t : { ...t, assigneeId: t.assigneeId === userId ? null : t.assigneeId, watcherIds: t.watcherIds.filter(w => w !== userId) }));
    };
    const upsertCategory = (projectId, name) => {
        const newCat = { id: genId(), name };
        setProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, categories: [...p.categories, newCat] }));
        return newCat.id;
    };
    const deleteCategory = (projectId, categoryId) => {
        setProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, categories: p.categories.filter(c => c.id !== categoryId) }));
        setTasks(prev => prev.map(t => t.projectId !== projectId ? t : { ...t, categories: t.categories.filter(cid => cid !== categoryId) }));
    };

    const canSeeTask = (task, uid) => {
        if (!uid) return false;
        const proj = projects.find(p => p.id === task.projectId);
        if (!proj) return false;
        if (isProjectAdmin(proj, uid)) return true;
        return task.createdBy === uid || task.assigneeId === uid || task.watcherIds.includes(uid);
    };

    const createTask = (payload) => {
        if (!currentUser) return;
        const t = {
            id: genId(),
            projectId: payload.projectId,
            title: payload.title,
            description: payload.description || '',
            dueDate: payload.dueDate || undefined,
            categories: payload.categories || [],
            assigneeId: payload.assigneeId || null,
            watcherIds: payload.watcherIds || [],
            status: 'open',
            createdBy: currentUser.id,
            attachments: [],
            comments: [],
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };
        setTasks(prev => [t, ...prev]);
        message.success('Задача создана');
    };
    const updateTask = (taskId, patch) => {
        setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, ...patch, updatedAt: new Date().toISOString() }));
    };
    const addAttachment = (taskId, filename) => {
        setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, attachments: [...t.attachments, { filename }], updatedAt: new Date().toISOString() }));
    };
    const addComment = (taskId, body) => {
        if (!currentUser) return;
        const c = { id: genId(), taskId, authorId: currentUser.id, body, createdAt: new Date().toISOString() };
        setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, comments: [...t.comments, c], updatedAt: new Date().toISOString() }));
    };
    const changeStatus = (task, next) => {
        const curr = task.status;
        if (!allowedTransitions[curr].includes(next)) { message.error('Недопустимый переход статуса'); return; }
        if (next === 'closed' && currentUser?.id !== task.createdBy) { message.error('Закрыть может только инициатор'); return; }
        updateTask(task.id, { status: next });
    };

    const value = { users, setUsers, projects, setProjects, tasks, setTasks, currentUser, setCurrentUserId, login, logout, register, isProjectMember, isProjectAdmin, canSeeTask, createProject, addProjectMember, removeProjectMember, upsertCategory, deleteCategory, createTask, updateTask, addAttachment, addComment, changeStatus };
    return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}