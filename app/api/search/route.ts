import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface Item {
    分类?: string;
    藏品名称: string;
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

interface SearchResult {
    name: string;
    category: string;
    source: string; // 'event' or 'all'
    sourceName: string;
    route: string;
    matchType: 'exact' | 'partial';
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const matchMode = searchParams.get('matchMode') || 'AND'; // AND | OR
    
    // Value range
    const valueMin = parseFloat(searchParams.get('valueMin') || '0');
    const valueMax = parseFloat(searchParams.get('valueMax') || '0');

    // Attribute ranges: e.g. attr_atk_min=100
    const attrFilters: { key: string, min: number, max: number }[] = [];
    searchParams.forEach((value, key) => {
        if (key.startsWith('attr_') && key.endsWith('_min')) {
            const attrKey = key.replace('attr_', '').replace('_min', '');
            const min = parseFloat(value);
            const max = parseFloat(searchParams.get(`attr_${attrKey}_max`) || '0');
            if (!isNaN(min) || (max > 0)) {
                attrFilters.push({ key: attrKey, min: isNaN(min) ? -Infinity : min, max: max > 0 ? max : Infinity });
            }
        }
    });

    const configPath = path.join(process.cwd(), 'public/data/config.json');
    let configData: ConfigData = { event: [], all: [] };

    try {
        if (fs.existsSync(configPath)) {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            configData = JSON.parse(fileContent);
        }
    } catch (e) {
        console.error("Failed to read config:", e);
        return NextResponse.json({ error: "Config error" }, { status: 500 });
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });
    const currentDate = new Date(now);

    const processConfig = (configs: EventConfig[], source: 'event' | 'all') => {
        for (const config of configs) {
            if (!includeExpired && source === 'event' && config.forceShow === false && config.startTime && config.endTime) {
                const end = new Date(config.endTime + 'T23:59:59+08:00');
                if (currentDate > end) continue;
            }

            let csvPath = path.join(process.cwd(), `public/data/${source}`, config.file);
            
            if (!fs.existsSync(csvPath)) {
                const otherSource = source === 'event' ? 'all' : 'event';
                const altPath = path.join(process.cwd(), `public/data/${otherSource}`, config.file);
                if (fs.existsSync(altPath)) {
                    csvPath = altPath;
                } else {
                    continue; 
                }
            }

            try {
                const csvText = fs.readFileSync(csvPath, 'utf-8');
                const parseResult = Papa.parse<Item>(csvText, {
                    header: true,
                    skipEmptyLines: true,
                });

                for (const item of parseResult.data) {
                    if (!item.藏品名称 || item.藏品名称 === '套装属性') continue;

                    let isMatch = false;
                    let conditionsMet = 0;
                    let totalConditions = 0;

                    if (query) {
                        totalConditions++;
                        const nameLower = item.藏品名称.toLowerCase();
                        if (item.藏品名称 === query || nameLower.includes(queryLower)) {
                            conditionsMet++;
                        }
                    }

                    if (category) {
                        totalConditions++;
                        if (item.分类 === category) {
                            conditionsMet++;
                        }
                    }

                    if (valueMin > 0 || valueMax > 0) {
                        totalConditions++;
                        const val = parseFloat(item.藏品价值) || 0;
                        let inRange = true;
                        if (valueMin > 0 && val < valueMin) inRange = false;
                        if (valueMax > 0 && val > valueMax) inRange = false;
                        if (inRange) conditionsMet++;
                    }

                    if (attrFilters.length > 0) {
                        
                        attrFilters.forEach(filter => {
                            totalConditions++;
                            const val = parseFloat(item[filter.key]) || 0;
                            let inRange = true;
                            if (filter.min > -Infinity && val < filter.min) inRange = false;
                            if (filter.max < Infinity && val > filter.max) inRange = false;
                            if (inRange) conditionsMet++;
                        });
                    }

                    if (matchMode === 'OR') {
                        isMatch = conditionsMet > 0;
                    } else {
                        if (totalConditions === 0) {
                            isMatch = true; 
                        } else {
                            isMatch = conditionsMet === totalConditions;
                        }
                    }

                    if (isMatch) {
                        let matchType: 'exact' | 'partial' = 'partial';
                        if (query && item.藏品名称 === query) matchType = 'exact';

                        results.push({
                            name: item.藏品名称,
                            category: item.分类 || '其他',
                            source: source,
                            sourceName: config.name,
                            route: `/${source}/${config.route}`,
                            matchType: matchType,
                            ...item
                        });
                    }
                }
            } catch (err) {
                console.error(`Error processing ${config.file}:`, err);
            }
        }
    };

    processConfig(configData.event, 'event');
    processConfig(configData.all, 'all');

    if (query) {
        results.sort((a, b) => {
            const score = (type: string) => {
                if (type === 'exact') return 2;
                return 1;
            };
            return score(b.matchType) - score(a.matchType);
        });
    }

    const total = results.length;
    const slicedResults = results.slice(offset, offset + limit);

    return NextResponse.json({ results: slicedResults, total });
}
