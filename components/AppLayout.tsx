"use client";
import React, { useState, useEffect } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { ConfigProvider } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CrownOutlined, HomeOutlined, SyncOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
                     // If it's the parent menu /events or /all, we don't want to navigate
                     if (item.path === '/events' || item.path === '/all') {
                         return <div style={{ cursor: 'default' }}>{dom}</div>;
                     }
                     return <Link href={item.path || '/'}>{dom}</Link>
                }}
                onMenuHeaderClick={() => router.push('/')}
                contentStyle={{ padding: 24 }}
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
