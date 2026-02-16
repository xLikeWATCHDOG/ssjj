import React from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createOrGetUser, getUserData } from '@/lib/actions';
import HomeClient from '@/components/HomeClient';

interface Item {
  藏品名称: string;
  藏品价值: string;
}

interface EventConfig {
  file: string;
  name: string;
  startTime?: string;
  endTime?: string;
  forceShow?: boolean;
  visible?: boolean; // Keep for backward compatibility if needed, but logic will prioritize forceShow
  route: string;
}

interface ConfigData {
  event: EventConfig[];
  all: EventConfig[];
}

export default async function Home() {
  // 1. Get User Data (Server-side)
  await createOrGetUser(); // Ensure user exists and cookie is set
  const ownedItems = await getUserData();

  // 2. Read Config (Server-side)
  const configPath = path.join(process.cwd(), 'public/data/config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const configData: ConfigData = JSON.parse(configContent);

  // 3. Calculate Stats
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });
  const currentDate = new Date(now);

  const seriesData = [];
  let summary = { totalCount: 0, ownedCount: 0, totalValue: 0, ownedValue: 0 };

  // Combine event and all configs for processing if needed, or just process 'all' as requested?
  // The user prompt specifically mentioned "event config file" (config.json) and "startTime/endTime".
  // Looking at config.json, "event" array has startTime/endTime, "all" array does not.
  // However, the current code ONLY iterates `configData.all`. 
  // It seems the current homepage ONLY shows "all" series.
  // If the user wants to show EVENTS on the homepage too, or if "all" items should also have time logic?
  // The user said "In the event configuration file... visible to forceShow... if forceShow is false, render based on startTime and endTime".
  // And the `config.json` snippet showed `event` array items having startTime.
  // BUT the current loop `for (const config of configData.all)` ignores `configData.event`.
  // I should probably include `configData.event` in the loop OR the user implies `configData.all` items might also have times?
  // Checking config.json again... `all` items don't have startTime. `event` items DO.
  // So I should probably process `configData.event` items as well and add them to `seriesData` if they are active.
  
  // Let's process BOTH 'event' and 'all' arrays, or check if 'event' items should be added.
  // The previous code only processed `all`. I will add `event` processing.
  
  const allConfigs = [...configData.event, ...configData.all];

  for (const config of allConfigs) {
    // Visibility Logic
    let isVisible = false;

    if (config.forceShow === true) {
        isVisible = true;
    } else if (config.forceShow === false && config.startTime && config.endTime) {
        const start = new Date(config.startTime + 'T00:00:00+08:00'); // Assuming YYYY-MM-DD
        const end = new Date(config.endTime + 'T23:59:59+08:00');
        
        // Simple comparison using timestamps
        if (currentDate >= start && currentDate <= end) {
            isVisible = true;
        }
    }

    if (!isVisible) continue;

    // Determine path: 'event' items are in public/data/event/, 'all' items in public/data/all/
    // We can guess based on where the config came from, or check file existence.
    // A robust way is to check both or rely on a flag. 
    // Since we merged arrays, let's check existence.
    
    let csvPath = path.join(process.cwd(), 'public/data/all', config.file);
    if (!fs.existsSync(csvPath)) {
        csvPath = path.join(process.cwd(), 'public/data/event', config.file);
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
    
    items.forEach(item => {
        if (!item.藏品名称) return;
        
        sTotalCount++;
        // Remove 'w' or other suffixes if present in value, though parseFloat usually handles '123w' -> 123
        // But better be safe if format varies. Assuming standard float parsable.
        const value = parseFloat(item.藏品价值) || 0;
        sTotalValue += value;
        
        if ((ownedItems[item.藏品名称] || 0) > 0) {
            sOwnedCount++;
            sOwnedValue += value;
        }
    });
    
    // Check if series already added (avoid duplicates if any)
    const existingIndex = seriesData.findIndex(s => s.name === config.name);
    if (existingIndex === -1) {
        seriesData.push({
            name: config.name,
            totalCount: sTotalCount,
            ownedCount: sOwnedCount,
            totalValue: sTotalValue,
            ownedValue: sOwnedValue,
            route: config.route
        });
        
        summary.totalCount += sTotalCount;
        summary.ownedCount += sOwnedCount;
        summary.totalValue += sTotalValue;
        summary.ownedValue += sOwnedValue;
    }
  }

  return (
    <HomeClient 
        initialStats={seriesData} 
        initialSummary={summary} 
    />
  );
}
