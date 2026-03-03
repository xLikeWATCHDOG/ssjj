import React from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createOrGetUser, getUserData } from '@/lib/actions';
import HomeClient from '@/components/HomeClient';
import { ATTRIBUTE_KEYS } from '@/lib/constants';

interface Item {
  分类: string;
  藏品名称: string;
  藏品价值: string;
  价格: string;
  属性?: string;
  [key: string]: any;
}

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

export default async function Home() {
  await createOrGetUser();
  const ownedItems = await getUserData();

  const configPath = path.join(process.cwd(), 'public/data/config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const configData: ConfigData = JSON.parse(configContent);

  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });
  const currentDate = new Date(now);

  const seriesData = [];
  let summary = { totalCount: 0, ownedCount: 0, totalValue: 0, ownedValue: 0 };
  
  const totalStats: Record<string, number> = {};
  const ownedStats: Record<string, number> = {};
  ATTRIBUTE_KEYS.forEach(key => {
      totalStats[key] = 0;
      ownedStats[key] = 0;
  });

  const allConfigs = [...configData.event, ...configData.all];

  for (const config of allConfigs) {
    let isVisible = false;

    if (config.forceShow === true) {
        isVisible = true;
    } else if (config.forceShow === false && config.startTime && config.endTime) {
        const start = new Date(config.startTime + 'T00:00:00+08:00'); // Assuming YYYY-MM-DD
        const end = new Date(config.endTime + 'T23:59:59+08:00');
        
        if (currentDate >= start && currentDate <= end) {
            isVisible = true;
        }
    }

    if (!isVisible) continue;
    
    let csvPath = path.join(process.cwd(), 'public/data/all', config.file);
    let routePrefix = 'all';
    
    if (!fs.existsSync(csvPath)) {
        csvPath = path.join(process.cwd(), 'public/data/event', config.file);
        routePrefix = 'event';
        if (!fs.existsSync(csvPath)) continue;
    }
    
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    
    const parseResult = Papa.parse<Item>(csvText, {
        header: true,
        skipEmptyLines: true,
    });
    
    const items = parseResult.data;
    
    let sTotalCount = 0;
    let sOwnedCount = 0;
    let sTotalValue = 0;
    let sOwnedValue = 0;
    
    const groups: Record<string, { items: Item[], setAttr: Item | null }> = {};
    
    items.forEach(item => {
        if (!item.分类) return;
        if (!groups[item.分类]) {
            groups[item.分类] = { items: [], setAttr: null };
        }
        if (item.藏品名称 === '套装属性') {
             groups[item.分类].setAttr = item;
        } else {
             groups[item.分类].items.push(item);
        }
    });

    Object.values(groups).forEach(group => {
        const isSetCompleted = group.setAttr && group.items.every(item => (ownedItems[item.藏品名称] || 0) > 0);
        
        group.items.forEach(item => {
            sTotalCount++;
            const value = parseFloat(item.藏品价值) || 0;
            sTotalValue += value;
            
            const isOwned = (ownedItems[item.藏品名称] || 0) > 0;
            if (isOwned) {
                sOwnedCount++;
                sOwnedValue += value;
            }
            
            ATTRIBUTE_KEYS.forEach(key => {
                if (item[key]) {
                    const val = parseFloat(item[key]) || 0;
                    totalStats[key] += val;
                    if (isOwned) {
                        ownedStats[key] += val;
                    }
                }
            });
        });

        if (group.setAttr) {
            ATTRIBUTE_KEYS.forEach(key => {
                if (group.setAttr![key]) {
                    const val = parseFloat(group.setAttr![key]) || 0;
                    totalStats[key] += val;
                    if (isSetCompleted) {
                        ownedStats[key] += val;
                    }
                }
            });
        }
    });
    
    const existingIndex = seriesData.findIndex(s => s.name === config.name);
    if (existingIndex === -1) {
        seriesData.push({
            name: config.name,
            totalCount: sTotalCount,
            ownedCount: sOwnedCount,
            totalValue: sTotalValue,
            ownedValue: sOwnedValue,
            route: config.route,
            link: `/${routePrefix}/${config.route}`
        });
        
        summary.totalCount += sTotalCount;
        summary.ownedCount += sOwnedCount;
        summary.totalValue += sTotalValue;
        summary.ownedValue += sOwnedValue;
    }
  }
  
  const globalAttributes = ATTRIBUTE_KEYS
    .filter(key => totalStats[key] > 0)
    .map(key => {
        const total = totalStats[key];
        const owned = ownedStats[key];
        const percent = total > 0 ? (owned / total) * 100 : 0;
        return {
            name: key,
            owned,
            total,
            percent
        };
    });

  return (
    <HomeClient 
        initialStats={seriesData} 
        initialSummary={summary} 
        globalAttributes={globalAttributes}
    />
  );
}
