"use client";
import React, { useState, useRef } from 'react';
import { Typography, Card, Progress, Row, Col, Statistic, Button, message, Grid, Tag } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';
import { formatNumber, getAttributeColor, formatAttributeValue } from '@/lib/utils';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface EventConfig {
  file: string;
  name: string;
  startTime?: string;
  endTime?: string;
  forceShow?: boolean;
  visible?: boolean;
  route: string;
}

interface ConfigData {
  event: EventConfig[];
  all: EventConfig[];
}

interface Item {
  藏品名称: string;
  藏品价值: string;
}

interface SeriesStats {
  name: string;
  totalCount: number;
  ownedCount: number;
  totalValue: number;
  ownedValue: number;
  route?: string;
  link?: string;
}

interface AttributeStat {
    name: string;
    owned: number;
    total: number;
    percent: number;
}

export default function HomeClient({ 
    initialStats, 
    initialSummary,
    globalAttributes
}: { 
    initialStats: SeriesStats[], 
    initialSummary: { 
        totalCount: number; 
        ownedCount: number; 
        totalValue: number; 
        ownedValue: number; 
    },
    globalAttributes: AttributeStat[]
}) {
  const [overallStats, setSeriesStats] = useState<SeriesStats[]>(initialStats);
  const [totalSummary, setTotalSummary] = useState(initialSummary);
  
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const printRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const handleGenerateImage = async () => {
      if (!printRef.current) return;
      try {
          const canvas = await html2canvas(printRef.current, {
              useCORS: true,
              backgroundColor: '#ffffff',
              scale: 2
          });
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = url;
          link.download = `ssjj_stats_${new Date().toISOString().slice(0,10)}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success('图片已生成并下载');
      } catch (err) {
          console.error(err);
          message.error('生成图片失败');
      }
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24, width: '100%' }}>
        <div ref={printRef} style={{ padding: 24, background: '#fff', minHeight: '80vh' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>藏品收集进度概览</Title>
            
            <Card title="总进度" variant="borderless" style={{ background: '#f5f5f5', marginBottom: 32 }}>
                <Row gutter={[48, 24]} justify="center">
                    <Col xs={24} sm={12} md={8} lg={6} style={{ textAlign: 'center' }}>
                        <Progress 
                            type="circle" 
                            percent={Math.round((totalSummary.ownedCount / (totalSummary.totalCount || 1)) * 100)} 
                            strokeColor="#389e0d"
                            size={200}
                            format={(percent) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 16 }}>收集进度</Text>
                                    <Text strong style={{ fontSize: 36, color: '#389e0d', margin: '8px 0' }}>{percent}%</Text>
                                    <Text type="secondary" style={{ fontSize: 16 }}>{formatNumber(totalSummary.ownedCount)} / {formatNumber(totalSummary.totalCount)}</Text>
                                </div>
                            )}
                        />
                        <div style={{ marginTop: 24 }}>
                            <Title level={4}>藏品数量</Title>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} style={{ textAlign: 'center' }}>
                        <Progress 
                            type="circle" 
                            percent={Math.round((totalSummary.ownedValue / (totalSummary.totalValue || 1)) * 100)} 
                            strokeColor="#faad14"
                            size={200}
                            format={(percent) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 16 }}>价值进度</Text>
                                    <Text strong style={{ fontSize: 36, color: '#faad14', margin: '8px 0' }}>{percent}%</Text>
                                    <Text type="secondary" style={{ fontSize: 16 }}>{formatNumber(totalSummary.ownedValue, true)} / {formatNumber(totalSummary.totalValue, true)}</Text>
                                </div>
                            )}
                        />
                        <div style={{ marginTop: 24 }}>
                            <Title level={4}>藏品总价值</Title>
                        </div>
                    </Col>
                </Row>
                
                {globalAttributes && globalAttributes.length > 0 && (
                    <div style={{ marginTop: 32, borderTop: '1px dashed #d9d9d9', paddingTop: 24 }}>
                        <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>已激活总属性</Title>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                            {globalAttributes.map((attr, idx) => (
                                <Tag key={idx} color={getAttributeColor(attr.name)} style={{ fontSize: 14, padding: '6px 12px' }}>
                                    {attr.name}: {formatAttributeValue(attr.name, attr.owned)}/{formatAttributeValue(attr.name, attr.total)} ({attr.percent.toFixed(2)}%)
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <Title level={3} style={{ marginTop: 32, marginBottom: 24, paddingLeft: 8, borderLeft: '4px solid #389e0d' }}>各系列详情</Title>
            <Row gutter={[24, 24]}>
                {overallStats.map((series) => (
                    <Col xs={24} sm={24} md={12} lg={8} xl={6} key={series.name}>
                        <Card 
                            title={series.name} 
                            hoverable 
                            style={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: (series.link || series.route) ? 'pointer' : 'default' }}
                            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                            onClick={() => {
                                if (series.link) {
                                    router.push(series.link);
                                } else if (series.route) {
                                    // Fallback for backward compatibility, though app/page.tsx should now provide link
                                    router.push(`/all/${series.route}`);
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Progress 
                                        type="circle" 
                                        percent={Math.round((series.ownedCount / (series.totalCount || 1)) * 100)} 
                                        size={100}
                                        strokeColor="#389e0d"
                                    />
                                    <div style={{ marginTop: 12 }}><Text strong>数量进度</Text></div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Progress 
                                        type="circle" 
                                        percent={Math.round((series.ownedValue / (series.totalValue || 1)) * 100)} 
                                        size={100}
                                        strokeColor="#faad14"
                                    />
                                    <div style={{ marginTop: 12 }}><Text strong>价值进度</Text></div>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: 'auto', background: '#fafafa', padding: 16, borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text type="secondary">已拥有数量</Text>
                                    <Text strong>{formatNumber(series.ownedCount)} / {formatNumber(series.totalCount)}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary">已解锁价值</Text>
                                    <Text strong style={{ color: '#389e0d' }}>{formatNumber(series.ownedValue)}</Text>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <div style={{ marginTop: 40, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Generated by 生死狙击藏品计算系统 @ {new Date().toLocaleString()}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Copyright © {new Date().getFullYear()} 史迪奇Birdy. All Rights Reserved.
                </Text>
            </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 40 }}>
            <Button type="primary" icon={<CameraOutlined />} size="large" onClick={handleGenerateImage}>
                生成统计图片
            </Button>
        </div>
    </div>
  );
}
