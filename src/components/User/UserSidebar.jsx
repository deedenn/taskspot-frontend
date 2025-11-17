import React from 'react';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import './UserSidebar.css';

function UserSidebar({ currentSection, onChangeSection, counts, efficiencyCount }) {
  const items = [
    {
      key: 'mine',
      label: 'Мои задачи',
      icon: <UserOutlined className="user-sidebar-item-icon" />,
      count: counts?.mine || 0,
    },
    {
      key: 'assigned',
      label: 'Исполняю',
      icon: <CheckCircleOutlined className="user-sidebar-item-icon" />,
      count: counts?.assigned || 0,
    },
    {
      key: 'overdue',
      label: 'Просроченные',
      icon: <ClockCircleOutlined className="user-sidebar-item-icon" />,
      count: counts?.overdue || 0,
    },
    {
      key: 'efficiency',
      label: 'Эффективность',
      icon: <LineChartOutlined className="user-sidebar-item-icon" />,
      count: efficiencyCount || 0,
    },
  ];

  return (
    <div className="user-sidebar">
      <div className="user-sidebar-header">
        Личный фокус по задачам
      </div>
      <div className="user-sidebar-list">
        {items.map((item) => {
          const isActive = currentSection === item.key;
          const countClass =
            item.key === 'overdue' && item.count
              ? 'user-sidebar-item-count user-sidebar-item-count--overdue'
              : 'user-sidebar-item-count';

          return (
            <button
              key={item.key}
              type="button"
              className={
                'user-sidebar-item' +
                (isActive ? ' user-sidebar-item--active' : '')
              }
              onClick={() => onChangeSection && onChangeSection(item.key)}
            >
              <div className="user-sidebar-item-left">
                {item.icon}
                <span className="user-sidebar-item-label">
                  {item.label}
                </span>
              </div>
              <span className={countClass}>{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default UserSidebar;
