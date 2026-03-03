import React from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { notFound } from 'next/navigation';
import { createOrGetUser, getUserData } from '@/lib/actions';
import EventClient from '@/components/EventClient';

interface Item {
  分类: string;
  藏品名称: string;
  价格: string;
  藏品价值: string;
  [key: string]: any;
}

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

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  await createOrGetUser();
  const ownedItems = await getUserData();

  const configPath = path.join(process.cwd(), 'public/data/config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const configData: ConfigData = JSON.parse(configContent);

  const allConfigs = [...(configData.event || []), ...(configData.all || [])];
  const eventConfig = allConfigs.find(c => c.route === slug);

  if (!eventConfig) {
      notFound();
  }

  let csvFolder = 'event';
  if (configData.all.find(c => c.route === slug)) {
      csvFolder = 'all';
  }

  const csvPath = path.join(process.cwd(), `public/data/${csvFolder}`, eventConfig.file);
  
  if (!fs.existsSync(csvPath)) {
      return <div>Data file not found: {eventConfig.file}</div>;
  }

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const parseResult = Papa.parse<Item>(csvText, {
      header: true,
      skipEmptyLines: true,
  });

  return (
      <EventClient 
          items={parseResult.data} 
          initialOwnedItems={ownedItems} 
          eventName={eventConfig.name} 
          startTime={eventConfig.startTime}
          endTime={eventConfig.endTime}
      />
  );
}
