import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { FileTextOutlined, ReadOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Content } = AntLayout;

const menuItems = [
  { key: '/', icon: <AppstoreOutlined />, label: '文章看板' },
  { key: '/reviews', icon: <ReadOutlined />, label: '审稿队列' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = menuItems.find((item) =>
    location.pathname === item.key || (item.key !== '/' && location.pathname.startsWith(item.key)),
  )?.key || '/';

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 40 }}>
          <FileTextOutlined style={{ fontSize: 24, color: '#fff', marginRight: 8 }} />
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            文章审稿平台
          </span>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '16px 24px', background: '#f5f5f5' }}>
        {children}
      </Content>
    </AntLayout>
  );
};

export default Layout;
