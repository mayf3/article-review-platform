import React from 'react';
import { Tag } from 'antd';
import type { ArticleStatus, Priority } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';

export const StatusBadge: React.FC<{ status: ArticleStatus }> = ({ status }) => (
  <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
);

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => (
  <Tag color={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority]}</Tag>
);
