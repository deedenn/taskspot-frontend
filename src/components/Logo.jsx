import React from 'react';
import { RocketOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const { Text } = Typography;

export default function Logo({ size = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1677ff, #52c41a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RocketOutlined style={{ color: '#fff', fontSize: size * 0.7 }} />
      </div>
      <Text className="app-logo-text" style={{ color: '#fff' }}>
        TaskSpot
      </Text>
    </div>
  );
}
