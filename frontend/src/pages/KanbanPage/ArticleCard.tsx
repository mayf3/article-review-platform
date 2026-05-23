import React from 'react';
import { Card, Tag, Dropdown } from 'antd';
import {
  CalendarOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Article, ArticleStatus } from '../../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PLATFORM_LABELS,
  COMPLEXITY_LABELS,
  COMPLEXITY_COLORS,
  COMPLEXITY_ICONS,
} from '../../types';
import { useNavigate } from 'react-router-dom';
import styles from './kanban.module.css';

const STATUS_FLOW: ArticleStatus[] = [
  'draft',
  'in_review',
  'approved',
  'publishing',
  'published',
];

interface ArticleCardProps {
  article: Article;
  onStatusChange?: (id: number, status: ArticleStatus) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onStatusChange }) => {
  const navigate = useNavigate();

  const nextStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(article.status) + 1);
  const prevStatuses = STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(article.status));

  const menuItems = [
    ...nextStatuses.map((s) => ({
      key: s,
      label: `标记为${STATUS_LABELS[s]}`,
    })),
    ...(prevStatuses.length > 0
      ? [{ type: 'divider' as const }, ...prevStatuses.map((s) => ({
          key: s,
          label: `回退到${STATUS_LABELS[s]}`,
        }))]
      : []),
  ];

  const handleStatusChange = (key: string) => {
    onStatusChange?.(article.id, key as ArticleStatus);
  };

  const dateStr = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('zh-CN')
    : '-';

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: ({ key }) => handleStatusChange(key) }}
      trigger={['contextMenu']}
    >
      <Card
        className={styles.articleCard}
        size="small"
        onClick={() => navigate(`/articles/${article.id}`)}
        hoverable
      >
        <div className={styles.cardTitle}>{article.title}</div>
        <div className={styles.cardMeta}>
          <Tag color={STATUS_COLORS[article.status]}>{STATUS_LABELS[article.status]}</Tag>
          <Tag color={PRIORITY_COLORS[article.priority]}>{PRIORITY_LABELS[article.priority]}</Tag>
          {article.complexity && (
            <Tag color={COMPLEXITY_COLORS[article.complexity]}>
              {COMPLEXITY_ICONS[article.complexity]} {COMPLEXITY_LABELS[article.complexity]}
            </Tag>
          )}
          {article.target_platforms?.map((p) => (
            <Tag key={p} bordered={false}>
              {PLATFORM_LABELS[p] || p}
            </Tag>
          ))}
        </div>
        <div className={styles.cardFooter}>
          <span>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dateStr}
          </span>
          {article.review_round > 0 && (
            <span>第 {article.review_round} 轮</span>
          )}
          <RightOutlined style={{ fontSize: 10, color: '#ccc' }} />
        </div>
      </Card>
    </Dropdown>
  );
};

export default ArticleCard;
