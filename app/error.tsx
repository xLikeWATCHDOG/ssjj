"use client";

import { useEffect } from "react";
import { Button, Result, Typography } from "antd";

const { Paragraph, Text } = Typography;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Result
        status="error"
        title="页面加载失败"
        subTitle="抱歉，系统遇到了一些问题，无法正常显示内容。"
        extra={[
          <Button type="primary" key="console" onClick={() => reset()}>
            尝试重新加载
          </Button>,
        ]}
      >
        <div className="desc">
          <Paragraph>
            <Text strong style={{ fontSize: 16 }}>错误详情:</Text>
          </Paragraph>
          <Paragraph>
            <Text type="danger">{error.message || "未知错误"}</Text>
          </Paragraph>
          {process.env.NODE_ENV === 'development' && error.stack && (
             <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, textAlign: 'left' }}>
                 <pre style={{ margin: 0, fontSize: 12 }}>{error.stack}</pre>
             </div>
          )}
        </div>
      </Result>
    </div>
  );
}
