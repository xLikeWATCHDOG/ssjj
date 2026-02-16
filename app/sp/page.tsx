import React from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createOrGetUser, getUserData } from '@/lib/actions';
import SpClient from '@/components/SpClient';

interface SpItem {
  分类: string;
  碎片名称: string;
}

export default async function SpPage() {
  await createOrGetUser();
  const ownedItems = await getUserData();

  let csvPath = path.join(process.cwd(), 'public/data/sp.CSV');
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(process.cwd(), 'public/data/sp.csv');
  }
  let items: SpItem[] = [];

  if (fs.existsSync(csvPath)) {
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const parseResult = Papa.parse<SpItem>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    items = parseResult.data;
  }

  return <SpClient items={items} initialOwnedItems={ownedItems} />;
}
