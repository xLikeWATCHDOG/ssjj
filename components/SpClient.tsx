"use client";
import React, { useState, useMemo } from 'react';
import { Typography, InputNumber, Button, Card, Grid } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { updateUserData } from '@/lib/actions';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface SpItem {
  分类: string;
  碎片名称: string;
}

interface SpClientProps {
  items: SpItem[];
  initialOwnedItems: Record<string, number>;
}

export default function SpClient({ items, initialOwnedItems }: SpClientProps) {
  const [ownedItems, setOwnedItems] = useState(initialOwnedItems);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const updateQuantity = async (name: string, value: number | null) => {
    const quantity = value === null ? 0 : value;
    const newOwned = { ...ownedItems, [name]: quantity };
    setOwnedItems(newOwned);
    await updateUserData(newOwned);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, SpItem[]> = {};
    items.forEach(item => {
      const category = item.分类 || '其他';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>碎片管理</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        记录拥有的碎片数量，用于精确计算可合成的藏品。
      </Text>

      {Object.entries(groupedData).map(([category, groupItems]) => (
        <ProCard
          key={category}
          title={category}
          bordered
          headerBordered
          style={{ marginBottom: 16 }}
          boxShadow
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {groupItems.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 16px', 
                border: '1px solid #f0f0f0', 
                borderRadius: 8,
                background: ownedItems[item.碎片名称] > 0 ? '#f6ffed' : '#fff',
                borderColor: ownedItems[item.碎片名称] > 0 ? '#b7eb8f' : '#f0f0f0'
              }}>
                <Text strong>{item.碎片名称}</Text>
                <InputNumber 
                  min={0} 
                  value={ownedItems[item.碎片名称] || 0} 
                  onChange={(val) => updateQuantity(item.碎片名称, val)}
                  style={{ width: 100 }}
                />
              </div>
            ))}
          </div>
        </ProCard>
      ))}
    </div>
  );
}
