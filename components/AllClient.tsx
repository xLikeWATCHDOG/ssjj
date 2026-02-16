"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Tag, Typography, InputNumber, Button, Modal, Popconfirm, Grid, Progress, Segmented, Badge, Alert } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { CheckOutlined } from '@ant-design/icons';
import ItemName from './ItemName';
import AcquireModal from './AcquireModal';
import { updateUserData, getUserData } from '@/lib/actions';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

// Interfaces
interface Item {
  分类?: string;
  藏品名称: string;
  藏品价值: string;
  属性?: string;
  置换?: string;
  置换数量?: string;
  置换成功率?: string;
  合成?: string;
  合成数量?: string;
  合成成功率?: string;
  [key: string]: any;
}

interface AllClientProps {
    items: Item[];
    initialOwnedItems: Record<string, number>;
    categoryName: string;
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

// Map fragments to items (Basic mapping, can be expanded)
const FRAGMENT_MAPPING: Record<string, string> = {
    '工业区': '工业区凭证碎片',
    '城市突袭': '城市突袭凭证碎片',
    '无尽角斗场': '无尽角斗场凭证碎片',
    '传说之证': '传说之证碎片',
    '王者乱斗': '王者乱斗凭证碎片',
    '变异体': '变异体强化碎片',
    '武器': '武器强化碎片',
    '喷漆': '喷漆碎片',
    '活动': '通用活动碎片'
};

export default function AllClient({ items: initialItems, initialOwnedItems, categoryName }: AllClientProps) {
    const [ownedItems, setOwnedItems] = useState(initialOwnedItems);
    const [filterType, setFilterType] = useState<string>('all');
    const [acquireModalOpen, setAcquireModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Item | null>(null);
    const [acquireType, setAcquireType] = useState<'exchange' | 'synthesis'>('exchange');
    const [spItems, setSpItems] = useState<Record<string, number>>({});
    
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // Fetch SP items on mount
    useEffect(() => {
        const fetchSp = async () => {
            const data = await getUserData();
            setSpItems(data);
        };
        fetchSp();
    }, []);

    // Handlers
    const updateQuantity = async (name: string, value: number | null) => {
        const quantity = value === null ? 0 : value;
        const newOwned = { ...ownedItems, [name]: quantity };
        setOwnedItems(newOwned);
        await updateUserData(newOwned);
    };

    const handleAcquire = (item: Item, type: 'exchange' | 'synthesis') => {
        setCurrentItem(item);
        setAcquireType(type);
        setAcquireModalOpen(true);
    };

    const formatAttributes = (item: any) => {
      const attrs: string[] = [];
      const EXCLUDED_KEYS = ['置换', '置换数量', '置换成功率', '合成', '合成数量', '合成成功率'];
      
      ATTRIBUTE_KEYS.forEach(key => {
          if (!EXCLUDED_KEYS.includes(key) && item[key]) {
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
        const price = parseFloat(item.价格) || 0; // Assuming '价格' exists for sorting, though might be missing in All list.
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

    // Grouping
    const groupedData = useMemo(() => {
        const groups: Record<string, { items: Item[], setAttr?: Item, fragmentName?: string, fragmentCount?: number }> = {};
        
        initialItems.forEach(item => {
            const category = (item.分类 || '').trim() || '其他';
            if (!groups[category]) {
                groups[category] = { 
                    items: [],
                    fragmentName: FRAGMENT_MAPPING[category],
                    fragmentCount: FRAGMENT_MAPPING[category] ? (spItems[FRAGMENT_MAPPING[category]] || 0) : 0
                };
            }
            item.属性 = formatAttributes(item);
            groups[category].items.push(item);
        });

        // Calculate scores
        Object.values(groups).forEach(group => {
            group.items.forEach(item => {
                 item.score = calculateScore(item, 0);
            });
        });

        return groups;
    }, [initialItems, spItems]);

    // Recommendation Threshold
    const recommendationThreshold = useMemo(() => {
        const unownedItems = initialItems.filter(item => 
            !ownedItems[item.藏品名称]
        );
        if (unownedItems.length === 0) return 0;
        // Calculate scores for all first if not done
        unownedItems.forEach(item => {
            if (item.score === undefined) item.score = calculateScore(item, 0);
        });
        unownedItems.sort((a, b) => (b.score || 0) - (a.score || 0));
        let count = Math.ceil(unownedItems.length * 0.2);
        if (count < 1 && unownedItems.length > 0) count = 1;
        return unownedItems[count - 1]?.score || 0;
    }, [initialItems, ownedItems]);

    // Calculations
    const calculations = useMemo(() => {
        let ownedCollectionValue = 0;
        let totalCollectionValue = 0;
        let activeAttributes: string[] = [];

        Object.entries(groupedData).forEach(([category, { items, setAttr }]) => {
            let categoryOwnedCount = 0;
            items.forEach(item => {
                const collectionValue = parseFloat(item.藏品价值) || 0;
                totalCollectionValue += collectionValue;
                if ((ownedItems[item.藏品名称] || 0) > 0) {
                    ownedCollectionValue += collectionValue;
                    categoryOwnedCount++;
                    if (item.属性) activeAttributes.push(item.藏品名称);
                }
            });
            if (setAttr && categoryOwnedCount === items.length && items.length > 0) {
                 activeAttributes.push(`【${category}套装】: ${setAttr.藏品名称}`);
            }
        });
        return { totalCollectionValue, ownedCollectionValue, activeAttributes };
    }, [groupedData, ownedItems]);

    return (
        <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1200, margin: '0 auto' }}>
             <Title level={isMobile ? 3 : 2} style={{ marginBottom: isMobile ? 16 : 24 }}>{categoryName}</Title>

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
                            <Text type="secondary">藏品总价值: </Text>
                            <Text strong style={{ fontSize: 18 }}>{calculations.totalCollectionValue}</Text>
                        </div>
                        <div>
                            <Text type="secondary">已解锁藏品价值: </Text>
                            <Text strong style={{ fontSize: 18, color: '#389e0d' }}>{calculations.ownedCollectionValue}</Text>
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center' }}>
                        <Text type="secondary" style={{ marginRight: 8, whiteSpace: 'nowrap' }}>进度: </Text>
                        <Progress percent={Math.round((calculations.ownedCollectionValue / (calculations.totalCollectionValue || 1)) * 100)} />
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
             </ProCard>

             {Object.entries(groupedData).map(([category, { items, setAttr, fragmentName, fragmentCount }]) => {
                const isSetCompleted = setAttr && items.every(item => (ownedItems[item.藏品名称] || 0) > 0);
                
                const visibleItems = items.filter(item => {
                    if (filterType === 'unowned') return !ownedItems[item.藏品名称];
                    if (filterType === 'recommended') {
                        const isOwned = !!ownedItems[item.藏品名称];
                        // Ensure score is present
                        const score = item.score || 0;
                        const isRecommended = !isOwned && score >= recommendationThreshold && score > 0;
                        return isRecommended;
                    }
                    return true;
                });

                if ((filterType === 'unowned' || filterType === 'recommended') && visibleItems.length === 0) return null;

                return (
                    <ProCard
                        key={category}
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>{category}</span>
                                {fragmentName && (
                                    <Tag color="blue">
                                        碎片: {fragmentName} x {fragmentCount || 0}
                                    </Tag>
                                )}
                            </div>
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
                                const isOwned = (ownedItems[item.藏品名称] || 0) > 0;
                                const isRecommended = !isOwned && (item.score || 0) >= recommendationThreshold && (item.score || 0) > 0;
                                
                                // Calculate craftable status
                                let craftInfo = null;
                                if (item.合成 && fragmentName && item.合成数量) {
                                    const required = parseInt(item.合成数量);
                                    const current = fragmentCount || 0;
                                    const canCraft = current >= required;
                                    const craftRate = item.合成成功率 || '100%';
                                    
                                    craftInfo = (
                                        <div style={{ marginTop: 8, fontSize: 12 }}>
                                            <Text type={canCraft ? 'success' : 'secondary'}>
                                                合成需: {required}碎片 (持有{current}) 
                                            </Text>
                                            {canCraft && <Tag color="green" style={{ marginLeft: 8 }}>可合成</Tag>}
                                            <span style={{ marginLeft: 8, color: '#999' }}>成功率: {craftRate}</span>
                                        </div>
                                    );
                                }
                                
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
                                        {craftInfo}
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        width: isMobile ? '100%' : 'auto', 
                                        justifyContent: isMobile ? 'space-between' : 'flex-end', 
                                        alignItems: isMobile ? 'center' : 'flex-end', 
                                        marginTop: isMobile ? 8 : 0
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: isMobile ? 16 : 0, marginRight: isMobile ? 0 : 24, minWidth: 100 }}>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>价值: </Text>
                                                <Text strong>{item.藏品价值}</Text>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {/* Quantity Control */}
                                            <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
                                                {ownedItems[item.藏品名称] > 0 ? (
                                                    <InputNumber 
                                                        min={0} 
                                                        value={ownedItems[item.藏品名称]} 
                                                        onChange={(val) => updateQuantity(item.藏品名称, val)}
                                                        size="small"
                                                        style={{ width: 60 }}
                                                    />
                                                ) : (
                                                    <Button 
                                                        size="small" 
                                                        type="dashed"
                                                        onClick={() => updateQuantity(item.藏品名称, 1)}
                                                    >
                                                        标记拥有
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Acquire Button */}
                                            {(item.置换 || item.合成) && (
                                                <>
                                                    {item.置换 && item.合成 ? (
                                                        <Popconfirm
                                                            title="选择获取方式"
                                                            description="请选择您想要查看的获取途径"
                                                            okText="置换"
                                                            cancelText="合成"
                                                            onConfirm={() => handleAcquire(item, 'exchange')}
                                                            onCancel={() => handleAcquire(item, 'synthesis')}
                                                            okButtonProps={{ ghost: true }}
                                                        >
                                                            <Button type="primary">获取</Button>
                                                        </Popconfirm>
                                                    ) : (
                                                        <Button 
                                                            type="primary" 
                                                            onClick={() => handleAcquire(item, item.置换 ? 'exchange' : 'synthesis')}
                                                        >
                                                            获取
                                                        </Button>
                                                    )}
                                                </>
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
                    </ProCard>
                );
             })}

            {/* Modals */}
            <AcquireModal
                open={acquireModalOpen}
                onCancel={() => setAcquireModalOpen(false)}
                targetItem={currentItem}
                allItems={initialItems}
                initialType={acquireType}
                ownedItems={ownedItems}
            />
        </div>
    );
}
