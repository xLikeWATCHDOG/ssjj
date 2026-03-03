import { ATTRIBUTE_KEYS, ATTRIBUTE_PRIORITIES } from './constants';

export const formatNumber = (value: number | string | undefined | null, compact: boolean = false): string => {
    if (value === undefined || value === null) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (compact) {
        if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    
    // For non-compact (detailed) view, use 3-digit comma separator
    return num.toLocaleString('en-US');
};

export const getCollectionValueColor = (value: number): string => {
    if (value >= 10000) return '#cf1322'; // Red for >= 10000
    if (value >= 5000) return '#d46b08';  // Orange for >= 5000
    if (value >= 1000) return '#d48806';  // Gold for >= 1000
    if (value >= 500) return '#1677ff';   // Blue for >= 500
    return '#389e0d';                     // Green for < 500
};

export const getAttributeColor = (attributeName: string): string => {
    const priority = ATTRIBUTE_PRIORITIES[attributeName] || 0;
    if (priority >= 9) return 'magenta'; 
    if (priority >= 7) return 'volcano';
    if (priority >= 5) return 'gold';
    if (priority >= 3) return 'geekblue';
    return 'cyan'; 
};

export const formatAttributeValue = (name: string, value: number, compact: boolean = false): string => {
    let formatted = formatNumber(value, compact);
    if (name.includes('暴击率')) {
        formatted += '%';
    }
    return formatted;
};

export const parseAttributes = (item: any, compact: boolean = false): { name: string, value: string }[] => {
    const attrs: { name: string, value: string }[] = [];
    ATTRIBUTE_KEYS.forEach(key => {
        if (item[key]) {
            const val = parseFloat(item[key]) || 0;
            attrs.push({ name: key, value: formatAttributeValue(key, val, compact) });
        }
    });
    return attrs;
};
