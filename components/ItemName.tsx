import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface ItemNameProps {
    name: string;
    style?: React.CSSProperties;
}

const ItemName: React.FC<ItemNameProps> = ({ name, style }) => {
    let color = 'inherit';
    let textDecoration = 'none';

    // Check for "作废"
    if (name.includes('作废')) {
        textDecoration = 'line-through';
        color = '#999'; // Gray out cancelled items
    } else {
        // Only apply colors if not cancelled
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
            color = '#1677ff'; // Blue for Expert
        } else if (name.includes('猎手')) {
            color = '#722ed1'; // Purple for Hunter
        } else if (name.includes('战神')) {
            color = '#cf1322'; // Red for God of War
        } else if (name.includes('至尊')) {
            color = '#faad14'; // Gold for Supreme
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

    return (
        <Text strong style={{ color, textDecoration, ...style }}>
            {name}
        </Text>
    );
};

export default ItemName;
