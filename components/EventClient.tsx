"use client";
import React, { useState, useMemo } from 'react';
import { ProCard } from '@ant-design/pro-components';
import { Tag, Typography, Button, Progress, Segmented, Badge, Grid, InputNumber } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import ItemName from './ItemName';
import { updateUserData } from '@/lib/actions';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

// Interfaces
interface Item {
  分类: string;
  藏品名称: string;
  价格: string;
  藏品价值: string;
  属性?: string;
  score?: number; // Calculated on client
  [key: string]: any;
}

const ATTRIBUTE_KEYS = [
    '生命值', '护盾值', '生命回复', '护盾回复', 
    '物理强度', '能量强度', '物理抗性', '能量抗性', 
    '物理抗性穿透', '能量抗性穿透', '能量值', '能量回复', 
    '物理暴击伤害', '能量暴击伤害', '能量暴击率', '物理暴击率', 
    '移动速度'
];

const ATTRIBUTE_PRIORITIES: Record<string, number> = {
    '生命值': 10, '护盾值': 10, '生命回复': 9, '护盾回复': 9,
    '物理强度': 4, '能量强度': 5, '物理抗性': 8, '能量抗性': 8,
    '物理抗性穿透': 2, '能量抗性穿透': 2, '能量值': 7, '能量回复': 3,
    '物理暴击伤害': 2, '能量暴击伤害': 2, '能量暴击率': 1, '物理暴击率': 1,
    '移动速度': 6
};

interface EventClientProps {
    items: Item[];
    initialOwnedItems: Record<string, number>;
    eventName: string;
    startTime?: string;
    endTime?: string;
}

export default function EventClient({ items: initialItems, initialOwnedItems, eventName, startTime, endTime }: EventClientProps) {
    const [ownedItems, setOwnedItems] = useState(initialOwnedItems);
    const [filterType, setFilterType] = useState<string>('all');
    
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // Check if event is expired
    const isExpired = useMemo(() => {
        if (!endTime) return false;
        const now = new Date();
        // Assume endTime is YYYY-MM-DD, append time to end of day in UTC+8
        // Or simply compare date strings if consistent. 
        // Using timestamp comparison:
        const end = new Date(endTime + 'T23:59:59+08:00');
        // Convert local now to compare with UTC+8 end time properly or just use timestamps
        // Simple way:
        return now.getTime() > end.getTime();
    }, [endTime]);

    const updateQuantity = async (name: string, value: number | null) => {
        const quantity = value === null ? 0 : value;
        const newOwned = { ...ownedItems, [name]: quantity };
        setOwnedItems(newOwned);
        await updateUserData(newOwned);
    };

    const formatAttributes = (item: any) => {
        const attrs: string[] = [];
        ATTRIBUTE_KEYS.forEach(key => {
            if (item[key]) {
                attrs.push(`${key}+${item[key]}`);
            }
        });
        return attrs.join(' ');
    };

    const calculateScore = (item: any, setBonusScore: number = 0) => {
        let performanceScore = 0;
        ATTRIBUTE_KEYS.forEach(key => {
            if (item[key]) {
                const value = parseFloat(item[key]) || 0;
                const priority = ATTRIBUTE_PRIORITIES[key] || 10;
                performanceScore += value * (100 / priority);
            }
        });
        performanceScore += setBonusScore;
        const price = parseFloat(item.价格) || 0;
        if (price <= 0) return performanceScore;
        return performanceScore / price;
    };

    const calculateRawScore = (item: any) => {
        let score = 0;
        ATTRIBUTE_KEYS.forEach(key => {
            if (item[key]) {
                const value = parseFloat(item[key]) || 0;
                const priority = ATTRIBUTE_PRIORITIES[key] || 10;
                score += value * (100 / priority);
            }
        });
        return score;
    }

    // Group data & Calculate Scores
    const groupedData = useMemo(() => {
        const groups: Record<string, { items: Item[], setAttr: Item | null }> = {};
        
        initialItems.forEach(item => {
            if (!item.分类) return;
            if (!groups[item.分类]) {
                groups[item.分类] = { items: [], setAttr: null };
            }
            if (item.藏品名称 === '套装属性') {
                item.属性 = formatAttributes(item);
                groups[item.分类].setAttr = item;
            } else {
                groups[item.分类].items.push(item);
            }
        });

        Object.values(groups).forEach(group => {
            let setBonusScorePerItem = 0;
            if (group.setAttr) {
                const totalSetScore = calculateRawScore(group.setAttr);
                if (group.items.length > 0) {
                    setBonusScorePerItem = totalSetScore / group.items.length;
                }
            }
            group.items.forEach(item => {
                item.属性 = formatAttributes(item);
                item.score = calculateScore(item, setBonusScorePerItem);
            });
        });
        
        return groups;
    }, [initialItems]);

    // Recommendation Threshold
    const recommendationThreshold = useMemo(() => {
        const unownedItems = initialItems.filter(item => 
            item.分类 && item.藏品名称 !== '套装属性' && !ownedItems[item.藏品名称]
        );
        if (unownedItems.length === 0) return 0;
        unownedItems.sort((a, b) => (b.score || 0) - (a.score || 0));
        let count = Math.ceil(unownedItems.length * 0.2);
        if (count < 1 && unownedItems.length > 0) count = 1;
        return unownedItems[count - 1]?.score || 0;
    }, [initialItems, ownedItems]);

    const calculations = useMemo(() => {
        let totalPrice = 0;
        let ownedPrice = 0;
        let ownedCollectionValue = 0;
        let activeAttributes: string[] = [];

        Object.entries(groupedData).forEach(([category, { items, setAttr }]) => {
            let categoryOwnedCount = 0;
            items.forEach(item => {
                const price = parseFloat(item.价格) || 0;
                const collectionValue = parseFloat(item.藏品价值) || 0;
                totalPrice += price;
                if ((ownedItems[item.藏品名称] || 0) > 0) {
                    ownedPrice += price;
                    ownedCollectionValue += collectionValue;
                    categoryOwnedCount++;
                    if (item.属性) activeAttributes.push(item.藏品名称);
                }
            });
            if (setAttr && categoryOwnedCount === items.length && items.length > 0) {
                 activeAttributes.push(`【${category}套装】: ${setAttr.藏品名称}`);
            }
        });
        return { totalPrice, ownedPrice, ownedCollectionValue, activeAttributes };
    }, [groupedData, ownedItems]);

    return (
        <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
                <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>{eventName}</Title>
                {startTime && endTime && (
                    <Text type={isExpired ? "danger" : "secondary"}>
                        活动时间: {startTime} ~ {endTime} {isExpired && '(已过期)'}
                    </Text>
                )}
            </div>
            
            <ProCard 
                title="统计信息" 
                headerBordered 
                bordered 
                style={{ marginBottom: 24 }}
                boxShadow
            >
                <div style={{ display: 'flex', gap: isMobile ? 16 : 40, flexWrap: 'wrap', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                    <div style={{ display: 'flex', gap: 40, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                        <div>
                            <Text type="secondary">总计活动币数: </Text>
                            <Text strong style={{ fontSize: 18 }}>{calculations.totalPrice}</Text>
                        </div>
                        <div>
                            <Text type="secondary">已拥有的藏品价值: </Text>
                            <Text strong style={{ fontSize: 18, color: '#389e0d' }}>{calculations.ownedCollectionValue}</Text>
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center' }}>
                        <Text type="secondary" style={{ marginRight: 8, whiteSpace: 'nowrap' }}>进度: </Text>
                        <Progress percent={Math.round(calculations.ownedPrice / (calculations.totalPrice || 1) * 100)} />
                    </div>
                    <div style={{ width: isMobile ? '100%' : 'auto' }}>
                        <Segmented
                            block={isMobile}
                            options={[
                                { label: '显示全部', value: 'all' },
                                { label: '仅显示未拥有', value: 'unowned' },
                                { label: '仅显示推荐', value: 'recommended' },
                            ]}
                            value={filterType}
                            onChange={setFilterType}
                        />
                    </div>
                </div>
                {calculations.activeAttributes.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Text strong>已激活属性:</Text>
                        <div style={{ marginTop: 8 }}>
                            {calculations.activeAttributes.map((attr, idx) => (
                                <Tag key={idx} color="blue" style={{ marginBottom: 4 }}>{attr}</Tag>
                            ))}
                        </div>
                    </div>
                )}
            </ProCard>

            {Object.entries(groupedData).map(([category, { items, setAttr }]) => {
                const isSetCompleted = setAttr && items.every(item => ownedItems[item.藏品名称]);
                const ownedCount = items.filter(item => ownedItems[item.藏品名称]).length;
                const totalCount = items.length;
                const progressPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
                
                const visibleItems = items.filter(item => {
                    if (filterType === 'unowned') return !ownedItems[item.藏品名称];
                    if (filterType === 'recommended') {
                        const isOwned = !!ownedItems[item.藏品名称];
                        const isRecommended = !isOwned && (item.score || 0) >= recommendationThreshold && (item.score || 0) > 0;
                        return isRecommended;
                    }
                    return true;
                });

                if ((filterType === 'unowned' || filterType === 'recommended') && visibleItems.length === 0) return null;

                return (
                    <ProCard
                        key={category}
                        title={
                            <span>
                                {category}
                                <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 'normal' }}>
                                    {ownedCount}/{totalCount} ({progressPercent}%)
                                </Text>
                            </span>
                        }
                        collapsible
                        defaultCollapsed={false}
                        bordered
                        style={{ marginBottom: 16 }}
                        headerBordered
                        boxShadow
                        extra={isSetCompleted && <Tag color="gold" icon={<CheckOutlined />}>套装已激活</Tag>}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {visibleItems.map((item, index) => {
                                 const isOwned = !!ownedItems[item.藏品名称];
                                 const isRecommended = !isOwned && (item.score || 0) >= recommendationThreshold && (item.score || 0) > 0;
                                 
                                 const content = (
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: isMobile ? 'flex-start' : 'center', 
                                        flexDirection: isMobile ? 'column' : 'row',
                                        padding: '12px 16px', 
                                        border: '1px solid #f0f0f0', 
                                        borderRadius: 8,
                                        background: isOwned ? '#f6ffed' : '#fff',
                                        borderColor: isOwned ? '#b7eb8f' : '#f0f0f0',
                                        position: 'relative',
                                        marginTop: isRecommended ? 10 : 0
                                    }}>
                                        <div style={{ flex: 1, marginRight: isMobile ? 0 : 16, marginBottom: isMobile ? 8 : 0, width: isMobile ? '100%' : 'auto' }}>
                                            <div style={{ fontSize: 16, marginBottom: 4 }}>
                                                <ItemName name={item.藏品名称} />
                                            </div>
                                            <div style={{ color: '#666', fontSize: 13 }}>{item.属性}</div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: isMobile ? 'center' : 'flex-end', marginTop: isMobile ? 8 : 0 }}>
                                            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: isMobile ? 16 : 0, marginRight: isMobile ? 0 : 24, minWidth: 100 }}>
                                                <div><Text type="secondary" style={{ fontSize: 12 }}>活动币: </Text><Text type="danger" strong>{item.价格}</Text></div>
                                                <div><Text type="secondary" style={{ fontSize: 12 }}>价值: </Text><Text strong>{item.藏品价值}</Text></div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', minWidth: 80, justifyContent: 'flex-end' }}>
                                                {ownedItems[item.藏品名称] > 0 ? (
                                                    <InputNumber min={0} value={ownedItems[item.藏品名称]} onChange={(val) => updateQuantity(item.藏品名称, val)} size="small" style={{ width: 60 }} />
                                                ) : (
                                                    <Button size="small" type="dashed" danger={isOwned} onClick={() => updateQuantity(item.藏品名称, 1)}>标记拥有</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                 );

                                 if (isRecommended) {
                                     return <Badge.Ribbon key={index} text="推荐" color="red">{content}</Badge.Ribbon>;
                                 }
                                 return <div key={index}>{content}</div>;
                            })}
                        </div>
                        {setAttr && (
                            <div style={{ marginTop: 16, padding: '12px', background: isSetCompleted ? '#fffbe6' : '#f5f5f5', borderRadius: 4, border: '1px dashed #d9d9d9' }}>
                                <Text strong>{setAttr.藏品名称}: </Text><Text>{setAttr.属性}</Text>
                                {!isSetCompleted && <Text type="secondary" style={{ marginLeft: 8 }}>(需集齐本组所有藏品)</Text>}
                            </div>
                        )}
                    </ProCard>
                );
            })}
        </div>
    );
}
