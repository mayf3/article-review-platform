import React, { useState } from 'react';
import { Select, Empty, Spin, Typography } from 'antd';
import {
  useArchiveVersions,
  useVersionContent,
  useVersionDiff,
} from '../../api/queries';

interface VersionPanelProps {
  articleId: number;
}

const VersionPanel: React.FC<VersionPanelProps> = ({ articleId }) => {
  const { data: versions, isLoading } = useArchiveVersions(articleId);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [fromVersion, setFromVersion] = useState<string | null>(null);
  const [toVersion, setToVersion] = useState<string | null>(null);

  const { data: versionContent, isLoading: loadingVersion } = useVersionContent(
    articleId,
    selectedVersion,
  );

  const { data: diffResult, isLoading: loadingDiff } = useVersionDiff(
    articleId,
    fromVersion || undefined,
    toVersion || undefined,
  );

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }

  const archiveList = versions ?? [];

  if (archiveList.length === 0) {
    return <Empty description="暂无历史版本" style={{ marginTop: 40 }} />;
  }

  const versionOptions = archiveList.map((v) => ({
    value: v.filename,
    label: v.filename,
  }));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          查看版本
        </Typography.Text>
        <Select
          style={{ width: '100%' }}
          placeholder="选择一个版本"
          value={selectedVersion}
          onChange={setSelectedVersion}
          options={versionOptions}
          allowClear
        />
      </div>

      {loadingVersion && <Spin />}
      {versionContent && !loadingVersion && (
        <div style={{
          background: '#f9f9f9',
          padding: 16,
          borderRadius: 8,
          maxHeight: 400,
          overflowY: 'auto',
          fontSize: 13,
          whiteSpace: 'pre-wrap' as const,
          fontFamily: 'monospace',
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
          {versionContent.markdown || JSON.stringify(versionContent, null, 2)}
        </div>
      )}

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          版本对比
        </Typography.Text>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="起始版本"
            value={fromVersion}
            onChange={setFromVersion}
            options={versionOptions}
          />
          <span style={{ lineHeight: '32px', color: '#999' }}>→</span>
          <Select
            style={{ flex: 1 }}
            placeholder="目标版本"
            value={toVersion}
            onChange={setToVersion}
            options={versionOptions}
          />
        </div>

        {loadingDiff && <Spin />}
        {diffResult && !loadingDiff && (
          <div style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 8,
            maxHeight: 400,
            overflowY: 'auto',
            fontSize: 13,
            fontFamily: 'Menlo, Monaco, monospace',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap' as const,
          }}>
            {Array.isArray(diffResult.diff)
              ? diffResult.diff.map((line: { type: string; content: string }, i: number) => {
                  const color = line.type === 'add' ? '#4ec9b0' : line.type === 'remove' ? '#f44747' : '#d4d4d4';
                  const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
                  return (
                    <div key={i} style={{ color }}>
                      {prefix}{line.content}
                    </div>
                  );
                })
              : diffResult.diff || '无差异'}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionPanel;
