"use client";
import React, {useEffect, useState} from 'react';
import {ProLayout} from '@ant-design/pro-components';
import {ConfigProvider, Popover, QRCode, Typography, Input, Tag, Tooltip} from 'antd';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {CrownOutlined, HomeOutlined, ShareAltOutlined, SyncOutlined, CheckCircleOutlined} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import ItemName from './ItemName';
import { getUserData } from '@/lib/actions';

interface EventConfig {
  file: string;
  name: string;
  startTime?: string;
  endTime?: string;
  forceShow?: boolean;
  route: string;
}

interface AppLayoutProps {
    children: React.ReactNode;
    initialEvents: EventConfig[];
    initialAllItems: EventConfig[];
}

export default function AppLayout({ children, initialEvents, initialAllItems }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [ownedItems, setOwnedItems] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchUserData = async () => {
        const data = await getUserData();
        setOwnedItems(data);
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
        setCurrentUrl(window.location.href);
    }
  }, [pathname]);

  const handleSearch = async (value: string) => {
    setSearchValue(value);
    if (!value) {
        setSearchResults([]);
        setSearchOpen(false);
        return;
    }

    setSearchLoading(true);
    setSearchOpen(true);

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        setSearchResults(data.results || []);
    } catch (e) {
        console.error("Search error:", e);
    } finally {
        setSearchLoading(false);
    }
  };

  const renderSearchContent = () => (
    <div style={{ width: 300 }}>
        {searchResults.length > 0 ? (
            <>
                {searchResults.map((item: any) => {
                    const isOwned = (ownedItems[item.name] || 0) > 0;
                    // Check if route already has params
                    const itemRoute = item.route.includes('?') 
                        ? `${item.route}&name=${encodeURIComponent(item.name)}`
                        : `${item.route}?name=${encodeURIComponent(item.name)}`;

                    return (
                        <div 
                            key={item.route}
                            style={{ 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center'
                            }}
                            onClick={() => {
                                setSearchOpen(false);
                                router.push(itemRoute);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Tooltip title={item.name} mouseEnterDelay={0.5}>
                                        <span><ItemName name={item.name} /></span>
                                    </Tooltip>
                                </div>
                                {isOwned && (
                                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 8, fontSize: 10, lineHeight: '18px', padding: '0 4px' }}>
                                        已拥有
                                    </Tag>
                                )}
                                <span style={{ color: '#999', fontSize: 12, marginLeft: 8, whiteSpace: 'nowrap' }}>
                                    {item.category}
                                </span>
                            </div>
                            <span style={{ color: '#1890ff', fontSize: 12, marginLeft: 16, whiteSpace: 'nowrap' }}>
                                {item.sourceName}
                            </span>
                        </div>
                    );
                })}
                <div 
                    style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        color: '#1890ff',
                        marginTop: 4
                    }}
                    onClick={() => {
                        setSearchOpen(false);
                        router.push(`/search?q=${encodeURIComponent(searchValue)}`);
                    }}
                >
                    查看详情...
                </div>
            </>
        ) : (
            <div style={{ padding: '16px', textAlign: 'center' }}>
                <Typography.Text type="secondary">无搜索结果</Typography.Text>
                <div style={{ marginTop: 8 }}>
                    <a onClick={() => {
                        setSearchOpen(false);
                        router.push('/search');
                    }}>前往高级搜索</a>
                </div>
            </div>
        )}
    </div>
  );

  const route = {
    path: '/',
    routes: [
      {
        path: '/',
        name: '首页',
        icon: <HomeOutlined />,
      },
      {
        path: '/events',
        name: '精彩活动/副本',
        icon: <CrownOutlined />,
        routes: initialEvents.map(event => ({
            path: `/event/${event.route}`,
            name: event.name,
        })),
      },
      {
        path: '/all',
        name: '藏品大全',
        icon: <CrownOutlined />,
        routes: initialAllItems.map(item => ({
            path: `/all/${item.route}`,
            name: item.name,
        })),
      },
      {
        path: '/sp',
        name: '碎片',
        icon: <CrownOutlined />, 
      },
      {
        path: '/sync',
        name: '云端同步',
        icon: <SyncOutlined />,
      },
    ],
  };

  if (!mounted) {
      return null;
  }

  return (
    <ConfigProvider locale={zhCN}>
        <div style={{ height: '100vh' }}>
            <ProLayout
                title="生死狙击藏品计算系统"
                logo={null}
                layout="top"
                route={route}
                location={{ pathname }}
                menuItemRender={(item, dom) => {
                     if (item.path === '/events' || item.path === '/all') {
                         return <div style={{ cursor: 'default' }}>{dom}</div>;
                     }
                     return <Link href={item.path || '/'}>{dom}</Link>
                }}
                onMenuHeaderClick={() => router.push('/')}
                contentStyle={{ padding: 24 }}
                actionsRender={() => [
                    <div key="search" style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
                        <Popover
                            content={renderSearchContent()}
                            trigger="click"
                            open={searchOpen}
                            onOpenChange={setSearchOpen}
                            placement="bottomRight"
                            arrow={false}
                            overlayInnerStyle={{ padding: 0 }}
                        >
                            <Input.Search 
                                placeholder="搜索藏品..." 
                                style={{ borderRadius: 20, width: 220 }}
                                value={searchValue}
                                onChange={(e) => handleSearch(e.target.value)}
                                onSearch={(value) => {
                                    if (value) {
                                        setSearchOpen(false);
                                        router.push(`/search?q=${encodeURIComponent(value)}`);
                                    }
                                }}
                                allowClear
                                loading={searchLoading}
                            />
                        </Popover>
                    </div>,
                    <Popover
                        key="share"
                        content={
                            <div style={{textAlign: 'center', padding: 8}}>
                                <QRCode value={currentUrl} size={160}
                                        bordered={false}/>
                                <Typography.Text type="secondary" style={{
                                    display: 'block',
                                    marginTop: 8,
                                    fontSize: 12,
                                    maxWidth: 160,
                                    wordBreak: 'break-all'
                                }}>
                                    {currentUrl}
                                </Typography.Text>
                            </div>
                        }
                        trigger="hover"
                        placement="bottomRight"
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            cursor: 'default',
                            color: 'rgba(0, 0, 0, 0.45)',
                            fontSize: 18
                        }}>
                            <ShareAltOutlined/>
                        </div>
                    </Popover>
                ]}
                footerRender={() => (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        Copyright © {new Date().getFullYear()} 史迪奇Birdy. All Rights Reserved.
                    </div>
                )}
            >
                {children}
            </ProLayout>
        </div>
    </ConfigProvider>
  );
}
