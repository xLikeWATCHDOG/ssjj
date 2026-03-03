"use client";
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {UploadProps} from 'antd';
import {Button, Card, Input, message, Modal, QRCode, Space, Typography, Upload} from 'antd';
import {
    CameraOutlined,
    CloudSyncOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    QrcodeOutlined,
    StopOutlined
} from '@ant-design/icons';
import jsqr from 'jsqr';
import {useSearchParams} from 'next/navigation';
import {checkUserExists, getUserId, syncUser} from '@/lib/actions';

const { Title, Paragraph, Text } = Typography;

export default function SyncPage() {
    const searchParams = useSearchParams();
    const [userId, setUserId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [scanning, setScanning] = useState(false);
    const scanningRef = useRef(false); // Add ref to track intent
    const [privacyMode, setPrivacyMode] = useState(true);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const [origin, setOrigin] = useState('');
    const handledCodeRef = useRef<string | null>(null);

    useEffect(() => {
        getUserId().then(id => {
            if (id) setUserId(id);
        });
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
        return () => {
            stopScan();
        };
    }, []);

    const qrValue = useMemo(() => {
        if (!userId) return '';
        const path = `/sync?code=${encodeURIComponent(userId)}`;
        return origin ? `${origin}${path}` : path;
    }, [userId, origin]);

    const normalizeSyncCode = useCallback((input: string) => {
        const raw = (input || '').trim();
        if (!raw) return '';
        let candidate = raw;
        if (raw.startsWith('{') || raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    candidate = String((parsed as any).userId || (parsed as any).id || (parsed as any).code || raw);
                }
            } catch {
            }
        }
        try {
            const url = new URL(candidate, origin || 'http://localhost');
            const code = url.searchParams.get('code');
            if (code) return code.trim();
        } catch {
        }
        return candidate;
    }, [origin]);

    const doSync = async (input: string) => {
        const trimmed = normalizeSyncCode(input).trim();
        if (!trimmed) {
            message.error('请输入目标用户 ID');
            return;
        }
        const res = await syncUser(trimmed);
        if (res.success) {
            message.success('同步成功，正在刷新...');
            setTimeout(() => window.location.reload(), 600);
        } else {
            message.error(`同步失败：${res.error || '未知错误'}`);
        }
    };

    useEffect(() => {
        const codeParam = searchParams.get('code');
        if (!codeParam) return;
        const normalized = normalizeSyncCode(codeParam);
        if (!normalized) {
            message.error('同步码无效');
            return;
        }
        if (handledCodeRef.current === normalized) return;
        handledCodeRef.current = normalized;
        const check = async () => {
            const res = await checkUserExists(normalized);
            if (res.success && res.exists) {
                Modal.confirm({
                    title: '确认同步',
                    content: `检测到同步码 ${normalized}，是否同步？`,
                    okText: '同步',
                    cancelText: '取消',
                    onOk: () => doSync(normalized),
                });
                return;
            }
            if (res.success) {
                message.error('未找到该同步码');
                return;
            }
            message.error(`检测失败：${res.error || '未知错误'}`);
        };
        check();
    }, [searchParams, normalizeSyncCode]);

    const handleImportQRImage: UploadProps['beforeUpload'] = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgUrl = e.target?.result as string;
            const img = new Image();
            img.src = imgUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (!context) {
                    message.error('无法创建画布');
                    return;
                }
                
                const MAX_SIZE = 1000;
                let width = img.width;
                let height = img.height;
                
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                context.drawImage(img, 0, 0, width, height);
                
                try {
                    const imageData = context.getImageData(0, 0, width, height);
                    const code = jsqr(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
                    
                    if (code) {
                        let id = normalizeSyncCode(code.data || '');
                        if (!id) {
                             const codeInverted = jsqr(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "onlyInvert",
                             });
                             if (codeInverted && codeInverted.data) {
                                 id = normalizeSyncCode(codeInverted.data.trim());
                             }
                        }

                        if (!id) {
                            message.error('未识别到有效的用户 ID');
                            return;
                        }
                        
                        message.success(`识别成功: ${id}`);
                        setTimeout(() => doSync(id), 500);
                    } else {
                        message.error('无法识别图片中的二维码，请尝试裁剪或提高清晰度');
                    }
                } catch (err) {
                    console.error(err);
                    message.error('识别过程出错');
                }
            };
        };
        reader.readAsDataURL(file);
        return false;
    };

    const stopScan = () => {
        scanningRef.current = false;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setScanning(false);
    };

    const startScan = async () => {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            message.error({
                content: (
                    <span>
                        无法调用摄像头：浏览器限制非 HTTPS 环境使用摄像头。<br/>
                        请使用 <b>localhost</b> 访问，或配置 HTTPS。<br/>
                        <small>当前: {window.location.origin}</small>
                    </span>
                ),
                duration: 8,
            });
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             message.error('当前浏览器不支持摄像头访问');
             return;
        }

        try {
            setScanning(true);
            scanningRef.current = true;
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            
            if (!scanningRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(e => console.error("Play error:", e));
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                const tick = () => {
                    if (!videoRef.current || !streamRef.current || !scanningRef.current) return;
                    
                    const video = videoRef.current;
                    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        const code = jsqr(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        if (code?.data) {
                            const id = normalizeSyncCode(code.data);
                            if (id) {
                                stopScan();
                                message.success('扫码成功');
                                doSync(id);
                                return;
                            }
                        }
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);
            }
        } catch (e: any) {
            console.error(e);
            setScanning(false);
            scanningRef.current = false;
            if (e.name === 'NotAllowedError') {
                message.error('请允许浏览器访问摄像头权限');
            } else if (e.name === 'NotFoundError') {
                message.error('未检测到摄像头设备');
            } else {
                message.error(`启动摄像头失败: ${e.message}`);
            }
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <Title level={2}>云端同步</Title>
            <Paragraph type="secondary">
                使用本机 ID 在多设备间同步/切换同一份云端数据。
            </Paragraph>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Card title="本机 ID" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setPrivacyMode(!privacyMode)}
                        >
                            <Paragraph copyable={{ text: userId }}>
                                <Text strong style={{ 
                                    fontSize: 22, 
                                    filter: privacyMode ? 'blur(6px)' : 'none',
                                    transition: 'filter 0.3s'
                                }}>
                                    {userId || '加载中...'}
                                </Text>
                            </Paragraph>
                            <div style={{ 
                                filter: privacyMode ? 'blur(8px)' : 'none',
                                transition: 'filter 0.3s',
                                marginTop: 8
                            }}>
                                <QRCode value={qrValue || 'loading'} size={220} />
                            </div>
                            <Button 
                                type="text" 
                                icon={privacyMode ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                style={{ marginTop: 8, color: '#999' }}
                            >
                                {privacyMode ? '点击显示' : '点击隐藏'}
                            </Button>
                        </div>
                        <Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
                            其他设备可扫码或输入此 ID 来同步
                        </Paragraph>
                    </div>
                </Card>

                <Card title="同步 / 切换账号" style={{ width: '100%' }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Input
                            placeholder="输入目标设备 ID"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            size="large"
                        />
                        <Button
                            type="primary"
                            icon={<CloudSyncOutlined />}
                            block
                            size="large"
                            onClick={() => doSync(targetId)}
                        >
                            同步 / 切换
                        </Button>
                    </Space>
                    <Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                        说明：输入另一台设备的 ID 后，本机将切换到该 ID 的云端数据
                    </Paragraph>
                </Card>

                <Card title="扫码 / 相册识别" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {!scanning ? (
                                <Button icon={<CameraOutlined />} onClick={startScan}>
                                    开始扫码
                                </Button>
                            ) : (
                                <Button danger icon={<StopOutlined />} onClick={stopScan}>
                                    停止扫码
                                </Button>
                            )}
                            <Upload beforeUpload={handleImportQRImage} showUploadList={false} accept="image/*">
                                <Button icon={<QrcodeOutlined />}>相册识别二维码</Button>
                            </Upload>
                        </div>

                        {scanning && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <video
                                    ref={videoRef}
                                    style={{ width: '100%', maxWidth: 520, borderRadius: 12, background: '#000' }}
                                    playsInline
                                    muted
                                />
                            </div>
                        )}

                        <Paragraph type="secondary" style={{ margin: 0 }}>
                            提示：若无法使用摄像头，可用“相册识别二维码”上传截图进行同步
                        </Paragraph>
                    </div>
                </Card>
            </div>
        </div>
    );
}
