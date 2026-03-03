"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Typography, List, Card, Pagination, Spin, Empty, Breadcrumb, Tag, Button, Collapse, Form, Input, InputNumber, Radio, Row, Col, Space, AutoComplete, Tooltip } from 'antd';
import { HomeOutlined, SearchOutlined, ArrowRightOutlined, CheckCircleOutlined, FilterOutlined, CloseSquareFilled } from '@ant-design/icons';
import ItemName from '@/components/ItemName';
import { formatNumber, parseAttributes, getAttributeColor } from '@/lib/utils';
import { getUserData } from '@/lib/actions';
import { ATTRIBUTE_KEYS } from '@/lib/constants';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export interface SearchResult {
    name: string;
    category: string;
    source: string;
    sourceName: string;
    route: string;
    matchType: 'exact' | 'partial';
    [key: string]: any; 
}

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const initialQ = searchParams.get('q') || '';
    
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [ownedItems, setOwnedItems] = useState<Record<string, number>>({});
    const pageSize = 10;

    const [form] = Form.useForm();
    const [advancedSearchValues, setAdvancedSearchValues] = useState<any>({});
    const [attributeOptions, setAttributeOptions] = useState<{ value: string }[]>(
        ATTRIBUTE_KEYS.map(attr => ({ value: attr }))
    );

    const getAttributePanelValue = (searchText: string) => {
        const filtered = ATTRIBUTE_KEYS
            .filter(attr => attr.includes(searchText))
            .map(attr => ({ value: attr }));
        setAttributeOptions(filtered);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const data = await getUserData();
            setOwnedItems(data);
        };
        fetchUserData();
        
        const initialPage = parseInt(searchParams.get('page') || '1');
        setCurrentPage(initialPage);

        const initialValues: any = { q: initialQ, matchMode: searchParams.get('matchMode') || 'AND', ownership: searchParams.get('ownership') || 'default' };
        if (searchParams.get('valueMin')) initialValues.valueMin = searchParams.get('valueMin');
        if (searchParams.get('valueMax')) initialValues.valueMax = searchParams.get('valueMax');
        
        const attributes: any[] = [];
        const params = new URLSearchParams(searchParams.toString());
        const attrKeys = new Set<string>();
        params.forEach((value, key) => {
            if (key.startsWith('attr_') && key.endsWith('_min')) {
                const attrKey = key.replace('attr_', '').replace('_min', '');
                attrKeys.add(attrKey);
            }
        });
        attrKeys.forEach(key => {
            attributes.push({
                key: key,
                min: params.get(`attr_${key}_min`),
                max: params.get(`attr_${key}_max`)
            });
        });
        if (attributes.length > 0) initialValues.attributes = attributes;

        form.setFieldsValue(initialValues);
        setAdvancedSearchValues(initialValues);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                
                Object.entries(advancedSearchValues).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        if (key === 'attributes') {
                            (value as any[]).forEach((attr: any) => {
                                if (attr && attr.key) {
                                    if (attr.min) params.append(`attr_${attr.key}_min`, attr.min.toString());
                                    if (attr.max) params.append(`attr_${attr.key}_max`, attr.max.toString());
                                }
                            });
                        } else {
                            params.append(key, value.toString());
                        }
                    }
                });

                params.append('limit', pageSize.toString());
                params.append('offset', ((currentPage - 1) * pageSize).toString());
                
                params.append('includeExpired', 'true');

                const routeParams = new URLSearchParams();
                if (advancedSearchValues.q) routeParams.append('q', advancedSearchValues.q);
                if (advancedSearchValues.matchMode && advancedSearchValues.matchMode !== 'AND') routeParams.append('matchMode', advancedSearchValues.matchMode);
                if (advancedSearchValues.ownership && advancedSearchValues.ownership !== 'default') routeParams.append('ownership', advancedSearchValues.ownership);
                if (advancedSearchValues.valueMin) routeParams.append('valueMin', advancedSearchValues.valueMin);
                if (advancedSearchValues.valueMax) routeParams.append('valueMax', advancedSearchValues.valueMax);
                if (advancedSearchValues.attributes) {
                    (advancedSearchValues.attributes as any[]).forEach((attr: any) => {
                        if (attr && attr.key) {
                            if (attr.min) routeParams.append(`attr_${attr.key}_min`, attr.min.toString());
                            if (attr.max) routeParams.append(`attr_${attr.key}_max`, attr.max.toString());
                        }
                    });
                }
                if (currentPage > 1) routeParams.append('page', currentPage.toString());
                
                const newUrl = `/search?${routeParams.toString()}`;

                const res = await fetch(`/api/search?${params.toString()}`);
                const data = await res.json();
                
                let fetchedResults = data.results || [];
                const totalCount = data.total || 0;

                if (advancedSearchValues.ownership && ownedItems) {
                    fetchedResults.sort((a: SearchResult, b: SearchResult) => {
                        const aOwned = (ownedItems[a.name] || 0) > 0;
                        const bOwned = (ownedItems[b.name] || 0) > 0;
                        
                        if (advancedSearchValues.ownership === 'owned_first') {
                            return (bOwned ? 1 : 0) - (aOwned ? 1 : 0);
                        } else if (advancedSearchValues.ownership === 'unowned_first') {
                            return (aOwned ? 1 : 0) - (bOwned ? 1 : 0);
                        }
                        return 0;
                    });
                }

                setResults(fetchedResults);
                setTotal(totalCount);
            } catch (e) {
                console.error("Search page error:", e);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 100);
        return () => clearTimeout(timer);

    }, [advancedSearchValues, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const params = new URLSearchParams(searchParams.toString());
        if (page > 1) {
            params.set('page', page.toString());
        } else {
            params.delete('page');
        }
        router.push(`/search?${params.toString()}`, { scroll: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = (values: any) => {
        setCurrentPage(1);
        setAdvancedSearchValues(values);

        const params = new URLSearchParams();
        if (values.q) params.append('q', values.q);
        if (values.matchMode && values.matchMode !== 'AND') params.append('matchMode', values.matchMode);
        if (values.ownership && values.ownership !== 'default') params.append('ownership', values.ownership);
        if (values.valueMin) params.append('valueMin', values.valueMin);
        if (values.valueMax) params.append('valueMax', values.valueMax);
        
        if (values.attributes) {
            (values.attributes as any[]).forEach((attr: any) => {
                if (attr && attr.key) {
                    if (attr.min) params.append(`attr_${attr.key}_min`, attr.min.toString());
                    if (attr.max) params.append(`attr_${attr.key}_max`, attr.max.toString());
                }
            });
        }
        
        router.push(`/search?${params.toString()}`, { scroll: false });
    };

    const handleReset = () => {
        form.resetFields();
        setAdvancedSearchValues({});
        setCurrentPage(1);
        router.push('/search', { scroll: false });
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <Breadcrumb
                items={[
                    { title: <a href="/"><HomeOutlined /> 首页</a> },
                    { title: '高级搜索' },
                ]}
                style={{ marginBottom: 24 }}
            />

            <div style={{ marginBottom: 24 }}>
                <Title level={2}>高级搜索</Title>
                <Text type="secondary">支持多条件组合筛选，查找您心仪的藏品</Text>
            </div>

            <Collapse defaultActiveKey={['1']} style={{ marginBottom: 24 }}>
                <Panel header={<span><FilterOutlined /> 筛选条件</span>} key="1">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSearch}
                        initialValues={{ matchMode: 'AND', attributes: [] }}
                    >
                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item name="q" label="藏品名称">
                                    <Input placeholder="请输入关键字..." allowClear prefix={<SearchOutlined />} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="藏品价值区间" style={{ marginBottom: 0 }}>
                                    <Space.Compact block>
                                        <Form.Item name="valueMin" noStyle>
                                            <InputNumber style={{ width: '50%' }} placeholder="最小值" min={0} />
                                        </Form.Item>
                                        <Input
                                            style={{
                                                width: 30,
                                                borderLeft: 0,
                                                borderRight: 0,
                                                pointerEvents: 'none',
                                                backgroundColor: '#fff',
                                            }}
                                            placeholder="~"
                                            disabled
                                        />
                                        <Form.Item name="valueMax" noStyle>
                                            <InputNumber style={{ width: '50%' }} placeholder="最大值" min={0} />
                                        </Form.Item>
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item label="属性筛选">
                            <Form.List name="attributes">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'key']}
                                                        noStyle
                                                        rules={[{ required: true, message: '选择属性' }]}
                                                    >
                                                        <AutoComplete 
                                                            options={attributeOptions} 
                                                            style={{ width: '100%' }} 
                                                            onSearch={getAttributePanelValue} 
                                                            placeholder="选择属性" 
                                                            allowClear={{ clearIcon: <CloseSquareFilled /> }} 
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Space.Compact block>
                                                        <Form.Item {...restField} name={[name, 'min']} noStyle>
                                                            <InputNumber style={{ width: '50%' }} placeholder="最小值" />
                                                        </Form.Item>
                                                        <Input
                                                            style={{
                                                                width: 30,
                                                                borderLeft: 0,
                                                                borderRight: 0,
                                                                pointerEvents: 'none',
                                                                backgroundColor: '#fff',
                                                            }}
                                                            placeholder="~"
                                                            disabled
                                                        />
                                                        <Form.Item {...restField} name={[name, 'max']} noStyle>
                                                            <InputNumber style={{ width: '50%' }} placeholder="最大值" />
                                                        </Form.Item>
                                                    </Space.Compact>
                                                </Col>
                                                <Col flex="none">
                                                    <Button type="text" danger onClick={() => remove(name)}>删除</Button>
                                                </Col>
                                            </Row>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block icon={<SearchOutlined />}>
                                                添加属性条件
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </Form.Item>

                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item name="matchMode" label="匹配模式">
                                    <Radio.Group>
                                        <Radio value="AND">满足所有条件 (AND)</Radio>
                                        <Radio value="OR">满足任一条件 (OR)</Radio>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="ownership" label="拥有状态排序" initialValue="default">
                                    <Radio.Group>
                                        <Radio value="default">默认</Radio>
                                        <Radio value="owned_first">拥有优先</Radio>
                                        <Radio value="unowned_first">未拥有优先</Radio>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col xs={24} style={{ textAlign: 'right' }}>
                                <Space>
                                    <Button onClick={handleReset}>重置</Button>
                                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                        搜索
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </Form>
                </Panel>
            </Collapse>

            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">共找到 {total} 条相关结果</Text>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                    <Spin size="large" />
                </div>
            ) : results.length > 0 ? (
                <>
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
                        dataSource={results}
                        renderItem={(item) => {
                            const isOwned = (ownedItems[item.name] || 0) > 0;
                            // Check if route already has params
                            const itemRoute = item.route.includes('?') 
                                ? `${item.route}&name=${encodeURIComponent(item.name)}`
                                : `${item.route}?name=${encodeURIComponent(item.name)}`;
                                
                            const attributes = parseAttributes(item);
                            const hasAttributes = attributes.length > 0;
                            const previewAttributes = attributes.slice(0, 3);
                            
                            const tooltipContent = hasAttributes ? (
                                <div style={{ maxWidth: 300 }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>属性详情:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {attributes.map((attr, idx) => (
                                            <Tag key={idx} color={getAttributeColor(attr.name)} style={{ margin: 0 }}>
                                                {attr.name}: {attr.value}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            ) : '暂无属性信息';

                            return (
                                <List.Item>
                                    <Tooltip title={tooltipContent} mouseEnterDelay={0.5} placement="right">
                                        <Card 
                                            hoverable 
                                            onClick={() => router.push(itemRoute)}
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ItemName name={item.name} style={{ fontSize: 16 }} />
                                                        {isOwned && (
                                                            <Tag color="success" icon={<CheckCircleOutlined />}>
                                                                已拥有
                                                            </Tag>
                                                        )}
                                                    </div>
                                                </div>
                                            }
                                            extra={<ArrowRightOutlined />}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text type="secondary" style={{ marginRight: 8 }}>分类:</Text>
                                                        <Text>{item.category}</Text>
                                                        <Text type="secondary" style={{ margin: '0 8px' }}>|</Text>
                                                        <Text type="secondary" style={{ marginRight: 8 }}>来源:</Text>
                                                        <Tag color={item.source === 'event' ? 'gold' : 'blue'} style={{ margin: 0 }}>
                                                            {item.sourceName}
                                                        </Tag>
                                                    </div>
                                                </div>
                                                
                                                {hasAttributes && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                        {previewAttributes.map((attr, idx) => (
                                                            <Tag key={idx} color={getAttributeColor(attr.name)} style={{ fontSize: 12, margin: 0 }}>
                                                                {attr.name}
                                                            </Tag>
                                                        ))}
                                                        {attributes.length > 3 && (
                                                            <Tag style={{ fontSize: 12, margin: 0 }}>...</Tag>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </Tooltip>
                                </List.Item>
                            );
                        }}
                    />
                    <div style={{ textAlign: 'center', marginTop: 32 }}>
                        <Pagination
                            current={currentPage}
                            total={total}
                            pageSize={pageSize}
                            onChange={handlePageChange}
                            showSizeChanger={false}
                        />
                    </div>
                </>
            ) : (
                <Empty description="未找到符合条件的藏品" />
            )}
        </div>
    );
}
