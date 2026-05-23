import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Button, Spin, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  CommentOutlined,
  AlertOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useArticle, useArticleContent } from '../../api/queries';
import { StatusBadge } from '../../components/StatusBadge';
import MarkdownViewer from '../../components/MarkdownViewer';
import CommentPanel from './CommentPanel';
import IssuePanel from './IssuePanel';
import VersionPanel from './VersionPanel';
import InfoPanel from './InfoPanel';
import styles from './detail.module.css';

const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleId = Number(id);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);

  const { data: article, isLoading: loadingArticle } = useArticle(articleId);
  const { data: contentData, isLoading: loadingContent } = useArticleContent(articleId);

  if (loadingArticle || loadingContent) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const markdownContent = contentData?.content || '';

  const tabItems = [
    {
      key: 'comments',
      label: (
        <span>
          <CommentOutlined /> 评论
        </span>
      ),
      children: <CommentPanel articleId={articleId} selectedParagraph={selectedParagraph} />,
    },
    {
      key: 'issues',
      label: (
        <span>
          <AlertOutlined /> 问题
        </span>
      ),
      children: <IssuePanel articleId={articleId} />,
    },
    {
      key: 'versions',
      label: (
        <span>
          <HistoryOutlined /> 版本
        </span>
      ),
      children: <VersionPanel articleId={articleId} />,
    },
    {
      key: 'info',
      label: (
        <span>
          <InfoCircleOutlined /> 信息
        </span>
      ),
      children: <InfoPanel articleId={articleId} />,
    },
  ];

  return (
    <div className={styles.detailPage}>
      <div className={styles.contentPanel}>
        <div className={styles.detailHeader}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
          >
            返回
          </Button>
          <div className={styles.detailTitle}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {article?.title || '文章详情'}
            </Typography.Title>
            {article && <StatusBadge status={article.status} />}
          </div>
        </div>
        <div className={styles.paragraphHint}>
          点击段落可添加评论
        </div>
        <div style={{ position: 'relative' }}>
          <MarkdownViewer
            content={markdownContent}
            selectedParagraph={selectedParagraph}
            onParagraphClick={(idx) =>
              setSelectedParagraph(selectedParagraph === idx ? null : idx)
            }
          />
        </div>
      </div>
      <div className={styles.sidePanel}>
        <Tabs
          className={styles.sidePanelTabs}
          defaultActiveKey="comments"
          items={tabItems}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default ArticleDetailPage;
