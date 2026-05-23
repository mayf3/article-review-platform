import React, { useState } from 'react';
import {
  Input,
  Select,
  Button,
  Empty,
  Spin,
  message,
  Badge,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useArticles, useCreateArticle, useUpdateArticle } from '../../api/queries';
import type { Article, ArticleStatus, Complexity, Priority } from '../../types';
import { STATUS_LABELS, STATUS_COLORS } from '../../types';
import ArticleCard from './ArticleCard';
import ArticleFormModal from './ArticleFormModal';
import styles from './kanban.module.css';

const STATUS_COLUMNS: ArticleStatus[] = [
  'draft',
  'in_review',
  'approved',
  'publishing',
  'published',
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const PLATFORM_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'wechat', label: '微信' },
  { value: 'feishu', label: '飞书' },
];

const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: 'simple', label: '🟢 简单' },
  { value: 'medium', label: '🟡 中等' },
  { value: 'complex', label: '🔴 复杂' },
];

const KanbanPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    status?: ArticleStatus;
    priority?: Priority;
    complexity?: Complexity;
    platform?: string;
    q?: string;
  }>({});
  const [formOpen, setFormOpen] = useState(false);

  const { data: responseData, isLoading } = useArticles(filters);
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const articles = responseData?.articles ?? [];

  const articlesByStatus = STATUS_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = articles.filter((a: Article) => a.status === status);
      return acc;
    },
    {} as Record<ArticleStatus, Article[]>,
  );

  const handleStatusChange = (id: number, status: ArticleStatus) => {
    updateMutation.mutate(
      { id, values: { status } },
      {
        onSuccess: () => message.success('状态已更新'),
        onError: (err) => message.error(err.message),
      },
    );
  };

  const handleCreate = (values: {
    title: string;
    slug?: string;
    priority?: Priority;
    target_platforms?: string[];
  }) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        message.success('文章创建成功');
        setFormOpen(false);
      },
      onError: (err) => message.error(err.message),
    });
  };

  return (
    <div className={styles.kanbanPage}>
      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          prefix={<SearchOutlined />}
          placeholder="搜索文章..."
          allowClear
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={STATUS_COLUMNS.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
          }))}
        />
        <Select
          placeholder="优先级"
          allowClear
          style={{ width: 100 }}
          onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          options={PRIORITY_OPTIONS}
        />
        <Select
          placeholder="复杂度"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setFilters((f) => ({ ...f, complexity: v }))}
          options={COMPLEXITY_OPTIONS}
        />
        <Select
          placeholder="平台"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setFilters((f) => ({ ...f, platform: v }))}
          options={PLATFORM_OPTIONS}
        />
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setFormOpen(true)}
        >
          新建文章
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : !articles.length ? (
        <Empty description="暂无文章" />
      ) : (
        <div className={styles.columns}>
          {STATUS_COLUMNS.map((status) => (
            <div key={status} className={styles.column}>
              <div className={styles.columnHeader}>
                <span>
                  <Badge color={STATUS_COLORS[status] === 'default' ? '#d9d9d9' : undefined} />
                  <span style={{ marginLeft: 8 }}>{STATUS_LABELS[status]}</span>
                </span>
                <Badge
                  count={articlesByStatus[status]?.length || 0}
                  style={{ backgroundColor: '#999' }}
                />
              </div>
              <div className={styles.cardList}>
                {articlesByStatus[status]?.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {(!articlesByStatus[status] || articlesByStatus[status].length === 0) && (
                  <div className={styles.emptyColumn}>
                    暂无文章
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ArticleFormModal
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
      />
    </div>
  );
};

export default KanbanPage;
