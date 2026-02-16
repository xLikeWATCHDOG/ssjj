import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Steps, Button, Popconfirm, Typography, Tag } from 'antd';
import ItemName from './ItemName';

const { Text } = Typography;

interface Item {
  藏品名称: string;
  置换?: string;
  置换数量?: string;
  置换成功率?: string;
  合成?: string;
  合成数量?: string;
  合成成功率?: string;
  [key: string]: any;
}

interface AcquireModalProps {
  open: boolean;
  onCancel: () => void;
  targetItem: Item | null;
  allItems: Item[]; // Needed for recursive lookup
  initialType?: 'exchange' | 'synthesis';
  ownedItems: Record<string, number>;
}

interface StepItem {
    title: string;
    description?: React.ReactNode;
}

const AcquireModal: React.FC<AcquireModalProps> = ({ open, onCancel, targetItem, allItems, initialType, ownedItems }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [path, setPath] = useState<{ item: Item, type: 'exchange' | 'synthesis' }[]>([]);

    useEffect(() => {
        if (open && targetItem) {
            // Initialize path with the target item
            // If initialType is provided, use it. Otherwise determine automatically.
            let type: 'exchange' | 'synthesis' = initialType || 'exchange';
            
            // Auto-detect if not provided or invalid
            if (!initialType) {
                if (targetItem.置换 && !targetItem.合成) type = 'exchange';
                else if (!targetItem.置换 && targetItem.合成) type = 'synthesis';
                // If both, default to exchange or wait for user input? 
                // The parent component handles the first choice via Popconfirm.
                // So initialType should be reliable for the first item.
            }
            
            setPath([{ item: targetItem, type }]);
            setCurrentStep(0); // 0 is the last step (target) in visual reverse order?
            // Requirement: "先渲染目标藏品...为步骤条的最后一步。设为当前步骤"
            // Let's build the visual steps based on 'path'.
            // Path[0] is the target. Path[1] is the material for Path[0], etc.
            // Steps should display: Material -> ... -> Target.
            // So visual steps = path.reverse().
        }
    }, [open, targetItem, initialType]);

    const handleMaterialClick = (materialName: string) => {
        // Find the material item in allItems
        const materialItem = allItems.find(i => i.藏品名称 === materialName);
        if (!materialItem) return;

        // Check acquisition methods
        const hasExchange = !!materialItem.置换;
        const hasSynthesis = !!materialItem.合成;

        if (!hasExchange && !hasSynthesis) {
            // No further path
            return;
        }

        const proceed = (type: 'exchange' | 'synthesis') => {
            setPath(prev => [...prev, { item: materialItem, type }]);
            // Step index will update automatically based on path length
        };

        if (hasExchange && hasSynthesis) {
            // Need user selection, handled in the render (Popconfirm)
            // But here we need to trigger it.
            // Actually, the click happens on the description of the current step.
            // We can handle the logic there.
        } else if (hasExchange) {
            proceed('exchange');
        } else {
            proceed('synthesis');
        }
    };

    const handleBack = () => {
        setPath(prev => prev.slice(0, -1));
    };

    // Helper to get color based on success rate
    const getRateColor = (rateStr?: string) => {
        if (!rateStr) return 'default';
        const rate = parseFloat(rateStr.replace('%', ''));
        if (isNaN(rate)) return 'default';
        if (rate >= 100) return '#389e0d'; // Dark Green
        if (rate >= 50) return '#faad14'; // Orange
        return '#ff4d4f'; // Red
    };

    const steps = useMemo(() => {
        
        return path.map((node, index) => {
            const isTarget = index === 0;
            const materialName = node.type === 'exchange' ? node.item.置换 : node.item.合成;
            const quantity = node.type === 'exchange' ? node.item.置换数量 : node.item.合成数量;
            const rateStr = node.type === 'exchange' ? node.item.置换成功率 : node.item.合成成功率;
            const method = node.type === 'exchange' ? '置换' : '合成';
            const methodColor = node.type === 'exchange' ? 'geekblue' : 'purple';
            const rateColor = getRateColor(rateStr);

            const materialItem = allItems.find(i => i.藏品名称 === materialName);
            const hasNextStep = materialItem && (materialItem.置换 || materialItem.合成);

            const isExpanded = index < path.length - 1;
            
            const ownedQuantity = ownedItems[node.item.藏品名称] || 0;

            return {
                title: (
                    <span>
                        <ItemName name={node.item.藏品名称} />
                        {ownedQuantity > 0 && <Text type="secondary" style={{ marginLeft: 8 }}> (拥有: {ownedQuantity})</Text>}
                    </span>
                ),
                description: (
                    <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Tag color={methodColor} style={{ marginRight: 0 }}>{method}</Tag>
                            {rateStr && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    (成功率: <span style={{ color: rateColor }}>{rateStr}</span>)
                                </Text>
                            )}
                        </div>
                        <div>
                            消耗: 
                            {hasNextStep ? (
                                materialItem && materialItem.置换 && materialItem.合成 ? (
                                    <Popconfirm
                                        title="选择获取方式"
                                        description={`请选择 ${materialName} 的获取途径`}
                                        okText="置换"
                                        cancelText="合成"
                                        onConfirm={() => {
                                            // Slice path to current index + 1, then append new choice
                                            setPath(prev => [...prev.slice(0, index + 1), { item: materialItem, type: 'exchange' }]);
                                        }}
                                        onCancel={() => {
                                            setPath(prev => [...prev.slice(0, index + 1), { item: materialItem, type: 'synthesis' }]);
                                        }}
                                        okButtonProps={{ ghost: true }}
                                    >
                                        <a style={{ marginLeft: 4 }}><ItemName name={materialName!} style={{ cursor: 'pointer' }} /></a>
                                    </Popconfirm>
                                ) : (
                                    isExpanded ? (
                                        // Already expanded and single path, just show text
                                        <span style={{ marginLeft: 4 }}><ItemName name={materialName!} /></span>
                                    ) : (
                                        // Not expanded yet, clickable
                                        <a 
                                            style={{ marginLeft: 4 }}
                                            onClick={() => handleMaterialClick(materialName!)}
                                        >
                                            <ItemName name={materialName!} style={{ cursor: 'pointer' }} />
                                        </a>
                                    )
                                )
                            ) : (
                                <span style={{ marginLeft: 4 }}><ItemName name={materialName!} /></span>
                            )}
                            <Text type="secondary"> x {quantity}</Text>
                        </div>
                    </div>
                )
            };
        }).reverse();
    }, [path, allItems]);
    
    const requiredBaseMaterial = useMemo(() => {
        if (path.length < 1) return null;

        // Logic correction based on user input:
        // "应当是各步骤下的消耗-已拥有数的乘积"
        // This implies a recursive calculation from top (Target) to bottom (Base Material).
        // At each step:
        // Needed_Next = (Needed_Current * Qty_Per_Current) - Owned_Next
        
        let neededQuantity = 1; // We start wanting 1 Target
        
        // Loop through the path from Top (Target) down to Bottom.
        for (let i = 0; i < path.length; i++) {
             const node = path[i];
             
             // Get recipe for current node
             const qtyStr = node.type === 'exchange' ? node.item.置换数量 : node.item.合成数量;
             const sourceName = node.type === 'exchange' ? node.item.置换 : node.item.合成;
             
             // If no recipe (e.g. it's a base material itself with no further steps in the path), we stop.
             if (!qtyStr || !sourceName) {
                 break;
             }
             
             const qtyPerUnit = parseFloat(qtyStr);
             const totalRequired = neededQuantity * qtyPerUnit;
             
             // Check if we own the SOURCE material
             const owned = ownedItems[sourceName] || 0;
             const netNeeded = Math.max(0, totalRequired - owned);
             
             // Update neededQuantity for the next iteration (which will process sourceName)
             neededQuantity = netNeeded;
             
             // If this is the last node in our visual path (i.e., i === path.length - 1),
             // then 'sourceName' IS the base material we are displaying at the bottom.
             // And 'neededQuantity' (which is now netNeeded) is the amount of 'sourceName' we need.
             
             if (i === path.length - 1) {
                 if (neededQuantity === 0) {
                     return {
                         name: sourceName,
                         count: 0,
                         isDirect: true,
                         sourceStepName: node.item.藏品名称
                     };
                 }
                 return {
                     name: sourceName,
                     count: neededQuantity
                 };
             }
             
             // If we have 0 needed for the next step, it means we have enough intermediate materials
             // to stop the chain here.
             if (neededQuantity === 0) {
                  return {
                     name: sourceName, 
                     count: 0,
                     isDirect: true, 
                     sourceStepName: node.item.藏品名称 
                 };
             }
        }
        
        return null;
    }, [path, ownedItems]);

    return (
        <Modal
            title="获取路径详情"
            open={open}
            onCancel={onCancel}
            footer={
                requiredBaseMaterial ? (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        {requiredBaseMaterial.count === 0 ? (
                            <Text type="success">
                                材料充足，可直接{path.find(p => p.item.藏品名称 === requiredBaseMaterial.sourceStepName)?.type === 'exchange' ? '置换' : '合成'} <ItemName name={requiredBaseMaterial.sourceStepName!} />
                            </Text>
                        ) : (
                            <>
                                <Text>至少需要 </Text>
                                <Text strong style={{ fontSize: 16 }}>{requiredBaseMaterial.count}</Text>
                                <Text> 个 </Text>
                                <ItemName name={requiredBaseMaterial.name!} />
                            </>
                        )}
                    </div>
                ) : null
            }
            width={600}
        >
            <Steps
                // @ts-ignore
                orientation="vertical"
                current={steps.length - 1} 
                items={steps.map(s => ({
                    title: s.title,
                    // @ts-ignore
                    content: s.description, 
                    status: 'process' 
                }))} 
            />
        </Modal>
    );
};

export default AcquireModal;
