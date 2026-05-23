import React from 'react';
import { Descriptions, Tag, Button, Space, Spin, Select, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { useArticle, useUpdateArticle } from '../../api/queries';
import type { Complexity } from '../../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PLATFORM_LABELS,
  COMPLEXITY_LABELS,
  COMPLEXITY_ICONS,
} from '../../types';

interface InfoPanelProps {
  articleId: number;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ articleId }) => {
  const { data: article, isLoading } = useArticle(articleId);
  const updateMutation = useUpdateArticle();

  const handleComplexityChange = (value: Complexity) => {
    updateMutation.mutate(
      { id: articleId, values: { complexity: value } },
      {
        onSuccess: () => message.success('复杂度已更新'),
        onError: (err) => message.error(err.message),
      },
    );
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }

  if (!article) return null;

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleString('zh-CN') : '-';

  const links = [
    { key: 'feishu', label: '飞书文档', url: article.feishu_url },
    { key: 'github', label: 'GitHub', url: article.github_url },
    { key: 'wechat', label: '微信草稿', url: article.wechat_draft_url },
  ].filter((l) => l.url);

  return (
    <div style={{ padding: '16px 0' }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="标题">{article.title}</Descriptions.Item>
        <Descriptions.Item label="Slug">{article.slug}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={STATUS_COLORS[article.status]}>{STATUS_LABELS[article.status]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={PRIORITY_COLORS[article.priority]}>{PRIORITY_LABELS[article.priority]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="复杂度">
          <Select
            value={article.complexity ?? undefined}
            placeholder="未分级"
            allowClear
            style={{ width: 140 }}
            onChange={handleComplexityChange}
            loading={updateMutation.isPending}
            options={[
              { value: 'simple', label: `${COMPLEXITY_ICONS.simple} ${COMPLEXITY_LABELS.simple}` },
              { value: 'medium', label: `${COMPLEXITY_ICONS.medium} ${COMPLEXITY_LABELS.medium}` },
              { value: 'complex', label: `${COMPLEXITY_ICONS.complex} ${COMPLEXITY_LABELS.complex}` },
            ]}
          />
        </Descriptions.Item>
        <Descriptions.Item label="审稿轮次">{article.review_round || 0}</Descriptions.Item>
        <Descriptions.Item label="目标平台">
          {article.target_platforms?.map((p) => (
            <Tag key={p}>{PLATFORM_LABELS[p] || p}</Tag>
          ))}
        </Descriptions.Item>
        <Descriptions.Item label="来源">{article.source || '-'}</Descriptions.Item>
        <Descriptions.Item label="目标读者">{article.target_audience || '-'}</Descriptions.Item>
        <Descriptions.Item label="核心论点">{article.core_claim || '-'}</Descriptions.Item>
        <Descriptions.Item label="预估字数">{article.estimated_words || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatDate(article.created_at)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDate(article.updated_at)}</Descriptions.Item>
        <Descriptions.Item label="发布时间">{formatDate(article.published_at)}</Descriptions.Item>
      </Descriptions>

      {links.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>外部链接</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            {links.map((link) => (
              <Button
                key={link.key}
                type="link"
                icon={<LinkOutlined />}
                href={link.url!}
                target="_blank"
                style={{ padding: 0 }}
              >
                {link.label}
              </Button>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
