import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppLayout from "../components/AppLayout";
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: "生死狙击藏品计算系统",
  description: "生死狙击藏品计算系统",
};

interface EventConfig {
  file: string;
  name: string;
  startTime?: string;
  endTime?: string;
  forceShow?: boolean;
  route: string;
}

interface ConfigData {
  event: EventConfig[];
  all: EventConfig[];
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read and filter config server-side
  const configPath = path.join(process.cwd(), 'public/data/config.json');
  let configData: ConfigData = { event: [], all: [] };
  
  try {
      if (fs.existsSync(configPath)) {
          const fileContent = fs.readFileSync(configPath, 'utf-8');
          configData = JSON.parse(fileContent);
      }
  } catch (e) {
      console.error("Failed to read config in RootLayout:", e);
  }

  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });
  const currentDate = new Date(now);

  const filterEvents = (items: EventConfig[]) => {
      return items.filter(config => {
          if (config.forceShow === true) return true;
          if (config.forceShow === false && config.startTime && config.endTime) {
              const start = new Date(config.startTime + 'T00:00:00+08:00');
              const end = new Date(config.endTime + 'T23:59:59+08:00');
              return currentDate >= start && currentDate <= end;
          }
          return false; 
      });
  };

  const activeEvents = filterEvents(configData.event || []).sort((a, b) => {
       const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
       const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
       return timeA - timeB;
  });

  const activeAll = filterEvents(configData.all || []);

  return (
    <html lang="zh-CN">
      <body className="antialiased" style={{ margin: 0 }}>
        <AntdRegistry>
          <AppLayout initialEvents={activeEvents} initialAllItems={activeAll}>
            {children}
          </AppLayout>
        </AntdRegistry>
      </body>
    </html>
  );
}
