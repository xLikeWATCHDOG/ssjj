import React from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { notFound } from 'next/navigation';
import { createOrGetUser, getUserData } from '@/lib/actions';
import AllClient from '@/components/AllClient';

interface Item {
  藏品名称: string;
  藏品价值: string;
  [key: string]: any;
}

interface EventConfig {
  file: string;
  name: string;
  visible?: boolean;
  route: string;
}

interface ConfigData {
  all: EventConfig[];
}

export default async function AllPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  await createOrGetUser();
  const ownedItems = await getUserData();

  const configPath = path.join(process.cwd(), 'public/data/config.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const configData: ConfigData = JSON.parse(configContent);

  const config = configData.all.find(c => c.route === slug);

  if (!config) {
      notFound();
  }

  const csvPath = path.join(process.cwd(), 'public/data/all', config.file);
  
  if (!fs.existsSync(csvPath)) {
      return <div>Data file not found: {config.file}</div>;
  }

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const parseResult = Papa.parse<Item>(csvText, {
      header: true,
      skipEmptyLines: true,
  });

  return (
      <AllClient 
          items={parseResult.data} 
          initialOwnedItems={ownedItems} 
          categoryName={config.name} 
      />
  );
}
