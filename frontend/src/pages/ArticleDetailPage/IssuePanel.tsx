import React, { useState } from 'react';
import { Tag, Card, Empty, Spin, Button, Modal, Input, Select, message, Space, Descriptions } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useReviews, useRespondToReview } from '../../api/queries';
import type { Review, ReviewIssue } from '../../types';

interface IssuePanelProps {
  articleId: number;
}

const SEVERITY_TAG_COLORS: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const STATUS_TAG_COLORS: Record<string, string> = {
  new: 'blue',
  unresolved: 'red',
  'in-progress': 'orange',
  resolved: 'green',
  wontfix: 'default',
};

const STATUS_ISSUE_LABELS: Record<string, string> = {
  new: '新建',
  unresolved: '未解决',
  'in-progress': '进行中',
  resolved: '已解决',
  wontfix: '不修复',
};

const ACTION_LABELS: Record<string, string> = {
  accepted: '接受',
  rejected: '拒绝',
  partial: '部分接受',
};

const IssuePanel: React.FC<IssuePanelProps> = ({ articleId }) => {
  const { data: reviews, isLoading } = useReviews(articleId);
  const respondMutation = useRespondToReview();

  const [respondModal, setRespondModal] = useState<{
    reviewId: number;
    issueIndex: number;
    issue: ReviewIssue;
  } | null>(null);
  const [respondAction, setRespondAction] = useState<'accepted' | 'rejected' | 'partial'>('accepted');
  const [respondReason, setRespondReason] = useState('');

  const allReviews = reviews ?? [];

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }

  if (allReviews.length === 0) {
    return <Empty description="暂无审稿记录" style={{ marginTop: 40 }} />;
  }

  const handleRespond = () => {
    if (!respondModal) return;
    respondMutation.mutate(
      {
        reviewId: respondModal.reviewId,
        responses: [{
          issue_index: respondModal.issueIndex,
          action: respondAction,
          reason: respondReason,
        }],
      },
      {
        onSuccess: () => {
          message.success('回复已提交');
          setRespondModal(null);
          setRespondReason('');
        },
        onError: (err) => message.error(err.message),
      },
    );
  };

  return (
    <div>
      {allReviews.map((review: Review) => (
        <div key={review.id} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            padding: '8px 12px',
            background: '#fafafa',
            borderRadius: 6,
          }}>
            <div>
              <span style={{ fontWeight: 600 }}>第 {review.round} 轮</span>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                审稿人：{review.reviewer || '未知'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {review.score != null && (
                <Tag color="blue">评分：{review.score}/10</Tag>
              )}
              {review.verdict && <Tag>{review.verdict}</Tag>}
            </div>
          </div>

          {(review.issues || []).map((issue: ReviewIssue, idx: number) => (
            <Card key={idx} size="small" style={{ marginBottom: 8, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Tag color={SEVERITY_TAG_COLORS[issue.severity]}>
                  {SEVERITY_LABELS[issue.severity] || issue.severity}
                </Tag>
                <Tag color={STATUS_TAG_COLORS[issue.status]}>
                  {STATUS_ISSUE_LABELS[issue.status] || issue.status}
                </Tag>
                {issue.location && (
                  <span style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
                    {issue.location}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>
                {issue.description}
              </div>
              {issue.suggestion && (
                <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>
                  建议：{issue.suggestion}
                </div>
              )}

              {issue.author_response ? (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: '#f6ffed',
                  borderRadius: 4,
                  fontSize: 13,
                }}>
                  <Space>
                    {issue.author_response.action === 'accepted' && (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )}
                    {issue.author_response.action === 'rejected' && (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    {issue.author_response.action === 'partial' && (
                      <MinusCircleOutlined style={{ color: '#faad14' }} />
                    )}
                    <span style={{ fontWeight: 500 }}>
                      {ACTION_LABELS[issue.author_response.action] || issue.author_response.action}
                    </span>
                  </Space>
                  {issue.author_response.reason && (
                    <div style={{ marginTop: 4, color: '#555' }}>
                      {issue.author_response.reason}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setRespondModal({ reviewId: review.id, issueIndex: idx, issue })}
                >
                  回复
                </Button>
              )}
            </Card>
          ))}
        </div>
      ))}

      <Modal
        title="回复审稿问题"
        open={!!respondModal}
        onCancel={() => setRespondModal(null)}
        onOk={handleRespond}
        confirmLoading={respondMutation.isPending}
        okText="提交"
        cancelText="取消"
      >
        {respondModal && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="问题描述">
                {respondModal.issue.description}
              </Descriptions.Item>
              <Descriptions.Item label="位置">
                {respondModal.issue.location || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={SEVERITY_TAG_COLORS[respondModal.issue.severity]}>
                  {SEVERITY_LABELS[respondModal.issue.severity]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>处理方式</div>
              <Select
                value={respondAction}
                onChange={setRespondAction}
                style={{ width: '100%' }}
                options={[
                  { value: 'accepted', label: '接受' },
                  { value: 'rejected', label: '拒绝' },
                  { value: 'partial', label: '部分接受' },
                ]}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>说明</div>
              <Input.TextArea
                value={respondReason}
                onChange={(e) => setRespondReason(e.target.value)}
                rows={3}
                placeholder="请输入说明..."
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default IssuePanel;
