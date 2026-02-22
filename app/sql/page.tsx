"use client";

import React, {useState} from 'react';
import {Alert, Button, Card, Input, message, Space, Table, Tag, Typography} from 'antd';
import {executeSql} from '@/lib/actions';

const { TextArea } = Input;
const { Title, Text } = Typography;

const COMMON_COMMANDS = [
    {label: '查询前 10 个用户', sql: 'SELECT * FROM User LIMIT 10;'},
    {label: '查询用户总数', sql: 'SELECT COUNT(*) as total FROM User;'},
    {label: '查询最新更新的用户', sql: 'SELECT * FROM User ORDER BY updatedAt DESC LIMIT 5;'},
    {label: '查看表结构', sql: 'DESCRIBE User;'},
];

export default function SqlPage() {
    const [sql, setSql] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExecute = async () => {
        if (!sql.trim()) return;
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const res = await executeSql(sql);
            if (res.success) {
                if (res.data) {
                    setResult(res.data);
                    message.success(`Query executed successfully. ${res.data.length} rows returned.`);
                } else if (res.meta) {
                    setResult(res.meta);
                    message.success('Command executed successfully.');
                }
            } else {
                setError(res.error || 'Unknown error');
                message.error('Execution failed');
            }
        } catch (err: any) {
            setError(err.message);
            message.error('Execution failed');
        } finally {
            setLoading(false);
        }
    };

    const columns = result && Array.isArray(result) && result.length > 0 
        ? Object.keys(result[0]).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            render: (text: any) => typeof text === 'object' ? JSON.stringify(text) : String(text),
        }))
        : [];

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <Title level={2}>Database Management (MySQL)</Title>
            <Alert 
                message="Warning: This page allows direct SQL execution." 
                description="Be careful with UPDATE/DELETE/DROP commands. There is no undo."
                type="warning" 
                showIcon 
                style={{ marginBottom: 24 }}
            />

            <Card title="Execute SQL" style={{ marginBottom: 24 }}>
                <div style={{marginBottom: 16}}>
                    <Text strong style={{display: 'block', marginBottom: 8}}>常用命令 (点击自动填充):</Text>
                    <Space wrap>
                        {COMMON_COMMANDS.map((cmd, idx) => (
                            <Tag
                                key={idx}
                                color="blue"
                                style={{cursor: 'pointer', padding: '4px 10px'}}
                                onClick={() => setSql(cmd.sql)}
                            >
                                {cmd.label}
                            </Tag>
                        ))}
                    </Space>
                </div>

                <TextArea 
                    rows={6} 
                    value={sql} 
                    onChange={e => setSql(e.target.value)} 
                    placeholder="SELECT * FROM User LIMIT 10;" 
                    style={{ fontFamily: 'monospace', marginBottom: 16 }}
                />
                <Button type="primary" onClick={handleExecute} loading={loading}>
                    Run Query
                </Button>
            </Card>

            {error && (
                <Alert 
                    message="Error" 
                    description={error} 
                    type="error" 
                    showIcon 
                    style={{ marginBottom: 24 }}
                />
            )}

            {result && (
                <Card title="Result">
                    {Array.isArray(result) ? (
                        <Table 
                            dataSource={result} 
                            columns={columns} 
                            rowKey={(record, index) => index?.toString() || String(Math.random())} // Best effort row key
                            scroll={{ x: true }}
                            pagination={{ pageSize: 10 }}
                        />
                    ) : (
                        <div>
                            <Text strong>Result Meta:</Text>
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
