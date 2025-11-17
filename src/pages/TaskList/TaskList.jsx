import React, { useMemo } from 'react';
import { Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { STATUS_META } from '../../constants/statusMeta';
import './TaskList.css';

function TaskList({ tasks, onTaskClick }) {
  const sortedTasks = useMemo(() => {
    const clone = [...tasks];
    clone.sort((a, b) => {
      const da = a.dueDate ? dayjs(a.dueDate) : null;
      const db = b.dueDate ? dayjs(b.dueDate) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.valueOf() - db.valueOf();
    });
    return clone;
  }, [tasks]);

  const columns = [
    {
      title: 'Задача',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span className="task-list-title">{text}</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const meta = STATUS_META[status] || {};
        return (
          <>
            <Tag color={meta.color}>
              {meta.label || status}
            </Tag>
            {record.awaitingConfirmation && (
              <Tag color="processing" style={{ marginLeft: 4 }}>
                Ждёт подтверждения
              </Tag>
            )}
          </>
        );
      },
    },
    {
      title: 'Срок',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate) => {
        if (!dueDate) return '—';
        const d = dayjs(dueDate);
        const now = dayjs();
        const isPast = d.isBefore(now, 'day');
        const isSoon =
          !isPast && d.isBefore(now.add(2, 'day'), 'day');

        const label = d.format('DD.MM.YYYY');

        if (isPast) {
          return (
            <span className="task-list-due task-list-due--overdue">
              {label}
            </span>
          );
        }
        if (isSoon) {
          return (
            <span className="task-list-due task-list-due--soon">
              {label}
            </span>
          );
        }
        return <span className="task-list-due">{label}</span>;
      },
    },
    {
      title: 'Категории',
      dataIndex: 'categories',
      key: 'categories',
      render: (cats) =>
        cats && cats.length ? (
          cats.map((cat) => (
            <Tag
              key={cat._id}
              color={cat.color || 'blue'}
              className="task-list-category-tag"
            >
              {cat.name}
            </Tag>
          ))
        ) : (
          '—'
        ),
    },
    {
      title: 'Ответственный',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee) =>
        assignee ? `${assignee.name}` : '—',
    },
  ];

  return (
    <div className="task-list">
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={sortedTasks}
        pagination={false}
        size="middle"
        onRow={(record) => ({
          onClick: () => onTaskClick && onTaskClick(record),
        })}
      />
    </div>
  );
}

export default TaskList;
