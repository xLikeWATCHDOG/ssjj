import React from 'react';
import { Typography, Tooltip } from 'antd';

const { Text } = Typography;

interface ItemNameProps {
    name: string;
    style?: React.CSSProperties;
}

const ZODIAC_ICONS: Record<string, string> = {
    '鼠': '🐭',
    '牛': '🐂',
    '虎': '🐅',
    '兔': '🐇',
    '龙': '🐉',
    '蛇': '🐍',
    '马': '🐎',
    '羊': '🐑',
    '猴': '🐒',
    '鸡': '🐔',
    '狗': '🐕',
    '猪': '🐖'
};

const ItemName: React.FC<ItemNameProps> = ({ name, style }) => {
    let color = 'inherit';
    let textDecoration = 'none';

    if (name.includes('作废')) {
        textDecoration = 'line-through';
        color = '#999';
    } else {
        if (name.includes('银白') || name.includes('白银')) {
            color = '#595959'; 
        } else if (name.includes('翠绿')) {
            color = '#389e0d'; 
        } else if (name.includes('湛蓝')) {
            color = '#0958d9'; 
        } else if (name.includes('梦紫')) {
            color = '#722ed1'; 
        } else if (name.includes('赤橙')) {
            color = '#d4380d'; 
        } else if (name.includes('传说')) {
            color = '#d46b08'; 
        } else if (name.includes('稀有')) {
            color = '#1d39c4'; 
        } else if (name.includes('黄金')) {
            color = '#d48806'; 
        } else if (name.includes('血玉')) {
            color = '#a8071a'; 
        } else if (name.includes('专家')) {
            color = '#1677ff';
        } else if (name.includes('猎手')) {
            color = '#722ed1';
        } else if (name.includes('战神')) {
            color = '#cf1322';
        } else if (name.includes('至尊')) {
            color = '#faad14';
        } else if (name.includes('暗金')) {
            color = '#876800';
        } else if (name.includes('隐藏')) {
            color = '#eb2f96';
        } else if (name.includes('铜质')) {
            color = '#b76e2e'; 
        } else if (name.includes('银质')) {
            color = '#8c8c8c';
        } else if (name.includes('水晶')) {
            color = '#13c2c2';
        } else if (name.includes('钛金')) {
            color = '#531dab';
        }

        const romanRegex = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/;
        const match = name.match(romanRegex);
        if (match) {
            const roman = match[1];
            switch (roman) {
                case 'I': color = '#595959'; break; 
                case 'II': color = '#389e0d'; break; 
                case 'III': color = '#0958d9'; break; 
                case 'IV': color = '#722ed1'; break; 
                case 'V': color = '#d48806'; break; 
                case 'VI': color = '#d4380d'; break; 
                case 'VII': color = '#a8071a'; break; 
                case 'VIII': color = '#c41d7f'; break; 
                case 'IX': color = '#531dab'; break; 
                case 'X': color = '#ad2102'; break; 
            }
        }
    }

    let zodiacIcon: React.ReactNode = null;
    const zodiacs = Object.keys(ZODIAC_ICONS);
    const foundZodiac = zodiacs.find(z => name.includes(z));
    if (foundZodiac) {
        zodiacIcon = (
            <Tooltip title={`${foundZodiac}年生肖`}>
                <span style={{ marginRight: 6, color: color === 'inherit' ? undefined : color }}>
                    {ZODIAC_ICONS[foundZodiac]}
                </span>
            </Tooltip>
        );
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {zodiacIcon}
            <Text strong style={{ color, textDecoration, ...style }}>
                {name}
            </Text>
        </span>
    );
};

export default ItemName;
