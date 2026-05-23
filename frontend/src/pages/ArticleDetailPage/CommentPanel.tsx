import React, { useState } from 'react';
import { Input, Button, Avatar, Empty, Spin, message, Popconfirm } from 'antd';
import { SendOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useComments, useCreateComment, useDeleteComment } from '../../api/queries';
import type { Comment } from '../../types';

interface CommentPanelProps {
  articleId: number;
  selectedParagraph?: number | null;
}

const CommentPanel: React.FC<CommentPanelProps> = ({ articleId, selectedParagraph }) => {
  const { data: comments, isLoading } = useComments(articleId);
  const createComment = useCreateComment(articleId);
  const deleteComment = useDeleteComment(articleId);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const allComments = comments ?? [];
  const topLevelComments = allComments.filter((c: Comment) => c.reply_to === null);
  const getReplies = (commentId: number) =>
    allComments.filter((c: Comment) => c.reply_to === commentId);

  const filteredComments = selectedParagraph != null
    ? topLevelComments.filter((c: Comment) => c.paragraph_index === selectedParagraph)
    : topLevelComments;

  const paragraphGroups: Record<number, Comment[]> = {};
  filteredComments.forEach((c: Comment) => {
    const key = c.paragraph_index ?? -1;
    if (!paragraphGroups[key]) paragraphGroups[key] = [];
    paragraphGroups[key].push(c);
  });

  const handleSubmit = () => {
    if (!text.trim()) return;
    createComment.mutate(
      { text: text.trim(), paragraph_index: selectedParagraph ?? undefined, type: 'comment' },
      {
        onSuccess: () => { setText(''); message.success('评论已添加'); },
        onError: (err) => message.error(err.message),
      },
    );
  };

  const handleReply = (commentId: number) => {
    if (!replyText.trim()) return;
    createComment.mutate(
      { text: replyText.trim(), reply_to: commentId, type: 'reply' },
      {
        onSuccess: () => { setReplyText(''); setReplyTo(null); message.success('回复已发送'); },
        onError: (err) => message.error(err.message),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteComment.mutate(id, {
      onSuccess: () => message.success('评论已删除'),
      onError: (err) => message.error(err.message),
    });
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedParagraph != null && (
          <div style={{
            padding: '8px 16px',
            background: '#e6f7ff',
            color: '#1890ff',
            fontSize: 13,
            marginBottom: 8,
            borderRadius: '0 0 6px 6px',
          }}>
            已选中第 {selectedParagraph + 1} 段
          </div>
        )}

        {filteredComments.length === 0 ? (
          <Empty
            description={selectedParagraph != null ? '该段落暂无评论' : '暂无评论'}
            style={{ marginTop: 40 }}
          />
        ) : (
          Object.entries(paragraphGroups).map(([paraKey, groupComments]) => (
            <div key={paraKey}>
              {Number(paraKey) >= 0 && (
                <div style={{
                  fontSize: 12,
                  color: '#1890ff',
                  padding: '8px 16px 4px',
                  background: '#f0f5ff',
                }}>
                  第 {Number(paraKey) + 1} 段
                </div>
              )}
              {groupComments.map((comment) => (
                <div key={comment.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size="small" icon={<UserOutlined />} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{comment.author || '匿名'}</span>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {new Date(comment.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button type="link" size="small" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                        回复
                      </Button>
                      <Popconfirm title="确认删除该评论？" onConfirm={() => handleDelete(comment.id)} okText="删除" cancelText="取消">
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, color: '#555', lineHeight: 1.6, paddingLeft: 32 }}>
                    {comment.text}
                  </div>

                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} style={{ marginLeft: 32, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #e8e8e8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar size={20} icon={<UserOutlined />} />
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{reply.author || '匿名'}</span>
                        <span style={{ fontSize: 11, color: '#999' }}>
                          {new Date(reply.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: '#555', paddingLeft: 28 }}>{reply.text}</div>
                    </div>
                  ))}

                  {replyTo === comment.id && (
                    <div style={{ marginTop: 8, marginLeft: 32, display: 'flex', gap: 8 }}>
                      <Input size="small" placeholder="输入回复..." value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onPressEnter={() => handleReply(comment.id)}
                      />
                      <Button size="small" type="primary" icon={<SendOutlined />}
                        onClick={() => handleReply(comment.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder={selectedParagraph != null ? `为第 ${selectedParagraph + 1} 段添加评论...` : '添加评论...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={createComment.isPending} />
        </div>
      </div>
    </div>
  );
};

export default CommentPanel;
