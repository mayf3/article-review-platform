import React from 'react';
import { Table, Tag, Empty, Spin, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useReviewQueue } from '../../api/queries';
import { PRIORITY_LABELS, PRIORITY_COLORS, PLATFORM_LABELS } from '../../types';
import type { Article } from '../../types';

const ReviewQueuePage: React.FC = () => {
  const { data: tasks, isLoading } = useReviewQueue();
  const navigate = useNavigate();

  const columns = [
    {
      title: '文章标题',
      key: 'title',
      render: (_: unknown, record: { article: Article }) => (
        <Button type="link" onClick={() => navigate(`/articles/${record.article.id}`)}>
          {record.article.title}
        </Button>
      ),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 100,
      render: (_: unknown, record: { article: Article }) => (
        <Tag color={PRIORITY_COLORS[record.article.priority]}>
          {PRIORITY_LABELS[record.article.priority]}
        </Tag>
      ),
    },
    {
      title: '审稿轮次',
      key: 'round',
      width: 120,
      render: (_: unknown, record: { round: number }) => `第 ${record.round} 轮`,
    },
    {
      title: '目标平台',
      key: 'platforms',
      width: 180,
      render: (_: unknown, record: { article: Article }) =>
        record.article.target_platforms?.map((p: string) => (
          <Tag key={p}>{PLATFORM_LABELS[p] || p}</Tag>
        )),
    },
    {
      title: '上轮摘要',
      key: 'summary',
      render: (_: unknown, record: { previous_review_summary: string }) => (
        <span style={{ fontSize: 12, color: '#666' }}>{record.previous_review_summary}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: { article: Article }) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/articles/${record.article.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
      <h2 style={{ marginBottom: 16 }}>审稿队列</h2>
      <Table
        columns={columns}
        dataSource={tasks ?? []}
        rowKey={(record) => (record as { article: Article }).article.id}
        locale={{ emptyText: <Empty description="暂无待审稿文章" /> }}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export default ReviewQueuePage;
