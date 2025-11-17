import React from 'react';
import { Layout, Button, Tag } from 'antd';
import './MainLayout.css';

const { Header, Content } = Layout;

function MainLayout({ children, currentUser, onLogout }) {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <img
              src="/taskspot-logo.svg"
              alt="TaskSpot"
              className="app-logo-image"
            />
          </div>
        </div>
        <div className="app-header-right">
          {currentUser && (
            <div className="app-user">
              {currentUser.isAdmin && (
                <Tag color="gold" className="app-user-role">
                  Админ
                </Tag>
              )}
              <span className="app-user-name">{currentUser.name}</span>
              <Button size="small" onClick={onLogout}>
                Выйти
              </Button>
            </div>
          )}
        </div>
      </Header>
      <Content className="app-content">{children}</Content>
    </Layout>
  );
}

export default MainLayout;
