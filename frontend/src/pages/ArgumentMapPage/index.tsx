import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  App,
  Button,
  Collapse,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  AimOutlined,
  ArrowLeftOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import mermaid from 'mermaid';
import { useArticle, useArticleContent } from '../../api/queries';
import {
  MockArgumentExtractor,
} from '../../services/argumentExtractor';
import type { IArgumentExtractor } from '../../services/argumentExtractor';
import {
  ARGUMENT_NODE_LABELS,
  ARGUMENT_RELATION_LABELS,
} from '../../types/argumentMap';
import type {
  ArgumentAuditItem,
  ArgumentMap,
  ArgumentNode,
  ArgumentNodeType,
  ArgumentRelation,
} from '../../types/argumentMap';
import styles from './argumentMap.module.css';

interface ArgumentMapLocationState {
  autoGenerate?: boolean;
}

const NODE_CLASS_BY_TYPE: Record<ArgumentNodeType, string> = {
  thesis: 'thesis',
  claim: 'claim',
  evidence: 'evidence',
  warrant: 'warrant',
  objection: 'objection',
  response: 'response',
  qualifier: 'qualifier',
  transition: 'transition',
};

const AUDIT_STATUS_LABELS: Record<ArgumentAuditItem['status'], string> = {
  pass: '通过',
  fail: '失败',
  warn: '警告',
};

const AUDIT_STATUS_COLORS: Record<ArgumentAuditItem['status'], string> = {
  pass: 'success',
  fail: 'error',
  warn: 'warning',
};

const AUDIT_SEVERITY_LABELS: Record<ArgumentAuditItem['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const splitParagraphs = (content: string) => {
  return content
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
};

const mermaidId = (id: string) => {
  return `node_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
};

const mermaidLabel = (text: string) => {
  return text
    .replace(/"/g, "'")
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\n/g, ' ');
};

const nodeShape = (node: ArgumentNode) => {
  const label = mermaidLabel(
    `${ARGUMENT_NODE_LABELS[node.type]}<br/>${truncate(node.text, 46)}`,
  );

  switch (node.type) {
    case 'thesis':
      return `(["${label}"])`;
    case 'evidence':
      return `[/"${label}"/]`;
    case 'objection':
      return `{{"${label}"}}`;
    case 'qualifier':
      return `(["${label}"])`;
    default:
      return `["${label}"]`;
  }
};

const edgeArrow = (relation: ArgumentRelation) => {
  if (relation === 'attacks' || relation === 'transitions_to') {
    return '-.->';
  }

  return '-->';
};

const edgeStyle = (relation: ArgumentRelation) => {
  switch (relation) {
    case 'attacks':
      return 'stroke:#cf1322,stroke-width:2px,stroke-dasharray:6 4';
    case 'responds_to':
      return 'stroke:#1677ff,stroke-width:2px';
    case 'qualifies':
      return 'stroke:#722ed1,stroke-width:2px';
    case 'bridges':
      return 'stroke:#08979c,stroke-width:2px';
    case 'transitions_to':
      return 'stroke:#8c8c8c,stroke-width:1.5px,stroke-dasharray:4 4';
    default:
      return 'stroke:#595959,stroke-width:1.5px';
  }
};

const buildMermaidDefinition = (argumentMap: ArgumentMap) => {
  const lines = [
    'flowchart BT',
    '  classDef thesis fill:#e6f4ff,stroke:#1677ff,stroke-width:2px,color:#10239e;',
    '  classDef claim fill:#f6ffed,stroke:#52c41a,stroke-width:1.5px,color:#135200;',
    '  classDef evidence fill:#fffbe6,stroke:#faad14,stroke-width:1.5px,color:#613400;',
    '  classDef warrant fill:#e6fffb,stroke:#13c2c2,stroke-width:1.5px,color:#006d75;',
    '  classDef objection fill:#fff1f0,stroke:#cf1322,stroke-width:2px,color:#820014;',
    '  classDef response fill:#f0f5ff,stroke:#2f54eb,stroke-width:1.5px,color:#061178;',
    '  classDef qualifier fill:#f9f0ff,stroke:#722ed1,stroke-width:1.5px,color:#391085;',
    '  classDef transition fill:#f5f5f5,stroke:#8c8c8c,stroke-width:1.5px,color:#262626;',
  ];

  argumentMap.nodes.forEach((node) => {
    lines.push(`  ${mermaidId(node.id)}${nodeShape(node)}`);
  });

  argumentMap.nodes.forEach((node) => {
    lines.push(`  class ${mermaidId(node.id)} ${NODE_CLASS_BY_TYPE[node.type]};`);
  });

  argumentMap.edges.forEach((edge) => {
    const relationLabel = ARGUMENT_RELATION_LABELS[edge.relation];
    const reason = truncate(edge.reason, 28);
    lines.push(
      `  ${mermaidId(edge.from)} ${edgeArrow(edge.relation)}|${mermaidLabel(`${relationLabel}: ${reason}`)}| ${mermaidId(edge.to)}`,
    );
  });

  argumentMap.edges.forEach((edge, index) => {
    lines.push(`  linkStyle ${index} ${edgeStyle(edge.relation)};`);
  });

  return lines.join('\n');
};

const renderAuditIcon = (status: ArgumentAuditItem['status']) => {
  if (status === 'pass') {
    return <CheckCircleOutlined />;
  }

  if (status === 'fail') {
    return <CloseCircleOutlined />;
  }

  return <ExclamationCircleOutlined />;
};

const ArgumentMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const articleId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ArgumentMapLocationState | null;
  const { message } = App.useApp();

  const { data: article, isLoading: loadingArticle } = useArticle(articleId);
  const { data: contentData, isLoading: loadingContent } = useArticleContent(articleId);

  const [argumentMap, setArgumentMap] = useState<ArgumentMap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 28, y: 28 });
  const [isDragging, setIsDragging] = useState(false);

  const hasGeneratedRef = useRef(false);
  const renderCountRef = useRef(0);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const markdownContent = contentData?.content || '';
  const paragraphs = useMemo(() => splitParagraphs(markdownContent), [markdownContent]);
  const extractor = useMemo<IArgumentExtractor>(() => new MockArgumentExtractor(), []);
  const jsonText = useMemo(
    () => (argumentMap ? JSON.stringify(argumentMap, null, 2) : ''),
    [argumentMap],
  );
  const mermaidDefinition = useMemo(
    () => (argumentMap ? buildMermaidDefinition(argumentMap) : ''),
    [argumentMap],
  );

  const highlightedParagraphs = useMemo(() => {
    const result = new Map<number, ArgumentNode[]>();

    argumentMap?.nodes.forEach((node) => {
      for (
        let index = node.source_span.paragraphStart;
        index <= node.source_span.paragraphEnd;
        index += 1
      ) {
        const relatedNodes = result.get(index) ?? [];
        relatedNodes.push(node);
        result.set(index, relatedNodes);
      }
    });

    return result;
  }, [argumentMap]);

  const generateMap = useCallback(async () => {
    setIsGenerating(true);

    try {
      const result = await extractor.extract({
        title: article?.title || contentData?.title,
        text: markdownContent,
      });
      setArgumentMap(result);
      setScale(1);
      setPan({ x: 28, y: 28 });
      message.success('逻辑地图已生成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '逻辑地图生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [article?.title, contentData?.title, extractor, markdownContent, message]);

  useEffect(() => {
    const shouldAutoGenerate = routeState?.autoGenerate ?? true;

    if (
      !loadingArticle &&
      !loadingContent &&
      shouldAutoGenerate &&
      !hasGeneratedRef.current
    ) {
      hasGeneratedRef.current = true;
      void generateMap();
    }
  }, [generateMap, loadingArticle, loadingContent, routeState?.autoGenerate]);

  useEffect(() => {
    if (!argumentMap || !mermaidContainerRef.current) {
      return;
    }

    let cancelled = false;
    const container = mermaidContainerRef.current;
    const renderId = `argument-map-${articleId || 'draft'}-${renderCountRef.current}`;
    renderCountRef.current += 1;

    const renderDiagram = async () => {
      container.innerHTML = '';
      container.classList.add(styles.rendering);
      container.textContent = '逻辑图渲染中...';

      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          themeVariables: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            primaryBorderColor: '#1677ff',
            lineColor: '#595959',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 18,
          },
        });

        const { svg, bindFunctions } = await mermaid.render(renderId, mermaidDefinition);

        if (cancelled) {
          return;
        }

        container.classList.remove(styles.rendering);
        container.innerHTML = svg;
        bindFunctions?.(container);
      } catch (error) {
        if (cancelled) {
          return;
        }

        container.classList.remove(styles.rendering);
        container.innerHTML = '';
        const errorNode = document.createElement('pre');
        errorNode.className = styles.renderError;
        errorNode.textContent =
          error instanceof Error ? error.message : 'Mermaid 渲染失败';
        container.appendChild(errorNode);
      }
    };

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [articleId, argumentMap, mermaidDefinition]);

  const adjustScale = (delta: number) => {
    setScale((current) => Math.min(1.8, Math.max(0.55, Number((current + delta).toFixed(2)))));
  };

  const resetViewport = () => {
    setScale(1);
    setPan({ x: 28, y: 28 });
  };

  const copyJson = async () => {
    if (!jsonText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(jsonText);
      message.success('JSON 已复制');
    } catch {
      message.error('复制失败，请手动选择 JSON 内容');
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!argumentMap) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) {
      return;
    }

    setPan({
      x: dragStartRef.current.panX + event.clientX - dragStartRef.current.pointerX,
      y: dragStartRef.current.panY + event.clientY - dragStartRef.current.pointerY,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!argumentMap) {
      return;
    }

    event.preventDefault();
    adjustScale(event.deltaY > 0 ? -0.08 : 0.08);
  };

  if (loadingArticle || loadingContent) {
    return (
      <div className={styles.loadingState}>
        <Spin size="large" />
      </div>
    );
  }

  const title = article?.title || contentData?.title || '文章逻辑地图';
  const sourceParagraphs =
    paragraphs.length > 0
      ? paragraphs
      : ['当前文章暂无正文内容，Mock Extractor 会使用内置中文样例生成逻辑地图。'];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/articles/${articleId}`)}
        >
          返回详情
        </Button>
        <div className={styles.headerTitle}>
          <Typography.Title level={4}>文章逻辑地图</Typography.Title>
          <Typography.Text type="secondary" title={title}>
            {title}
          </Typography.Text>
        </div>
        <Space wrap>
          <Button
            icon={<AimOutlined />}
            disabled
          >
            LLM 待接入
          </Button>
          <Button
            type="primary"
            icon={argumentMap ? <ReloadOutlined /> : <BranchesOutlined />}
            loading={isGenerating}
            onClick={() => void generateMap()}
          >
            {argumentMap ? '重新生成' : '生成逻辑地图'}
          </Button>
        </Space>
      </div>

      <div className={styles.workbench}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <Typography.Title level={5}>原文</Typography.Title>
            <Tag>{sourceParagraphs.length} 段</Tag>
          </div>
          <div className={styles.sourceBody}>
            {sourceParagraphs.map((paragraph, index) => {
              const relatedNodes = highlightedParagraphs.get(index) ?? [];
              const isHighlighted = relatedNodes.length > 0;

              return (
                <article
                  key={`${index}-${paragraph.slice(0, 12)}`}
                  className={`${styles.sourceParagraph} ${
                    isHighlighted ? styles.highlightedParagraph : ''
                  }`}
                >
                  <div className={styles.paragraphMeta}>
                    <span>段落 {index + 1}</span>
                    <Space size={[4, 4]} wrap>
                      {relatedNodes.map((node) => (
                        <Tag key={node.id} color="blue">
                          {ARGUMENT_NODE_LABELS[node.type]}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                  <Typography.Paragraph className={styles.paragraphText}>
                    {paragraph}
                  </Typography.Paragraph>
                </article>
              );
            })}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.mapPanel}`}>
          <div className={styles.panelHeader}>
            <Typography.Title level={5}>Mermaid 逻辑图</Typography.Title>
            <Space size={4}>
              <Button
                size="small"
                icon={<ZoomOutOutlined />}
                onClick={() => adjustScale(-0.12)}
                disabled={!argumentMap}
              />
              <Tag className={styles.zoomTag}>{Math.round(scale * 100)}%</Tag>
              <Button
                size="small"
                icon={<ZoomInOutlined />}
                onClick={() => adjustScale(0.12)}
                disabled={!argumentMap}
              />
              <Button
                size="small"
                icon={<FullscreenOutlined />}
                onClick={resetViewport}
                disabled={!argumentMap}
              />
            </Space>
          </div>
          <div
            className={`${styles.mapViewport} ${isDragging ? styles.dragging : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {argumentMap ? (
              <div
                ref={mermaidContainerRef}
                className={styles.mermaidCanvas}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                }}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="点击生成逻辑地图后显示 Mermaid 图谱"
              />
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <Typography.Title level={5}>逻辑审查报告</Typography.Title>
            <Tag color={argumentMap ? 'processing' : 'default'}>
              {argumentMap ? `${argumentMap.audit.length} 项` : '未生成'}
            </Tag>
          </div>
          <div className={styles.reportBody}>
            {argumentMap ? (
              <List
                dataSource={argumentMap.audit}
                renderItem={(item) => (
                  <List.Item className={styles.auditItem}>
                    <div className={styles.auditHeader}>
                      <Space size={6} wrap>
                        <Tag color={AUDIT_STATUS_COLORS[item.status]}>
                          {renderAuditIcon(item.status)} {AUDIT_STATUS_LABELS[item.status]}
                        </Tag>
                        <Tag>风险 {AUDIT_SEVERITY_LABELS[item.severity]}</Tag>
                      </Space>
                    </div>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Paragraph className={styles.auditDetail}>
                      {item.detail}
                    </Typography.Paragraph>
                    <Space size={[4, 4]} wrap>
                      {item.relatedNodeIds.map((nodeId) => (
                        <Tag key={nodeId} color="geekblue">
                          {nodeId}
                        </Tag>
                      ))}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审查报告" />
            )}
          </div>
        </section>
      </div>

      <Collapse
        className={styles.jsonPanel}
        items={[
          {
            key: 'json',
            label: '结构化 JSON',
            extra: (
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={!argumentMap}
                onClick={(event) => {
                  event.stopPropagation();
                  void copyJson();
                }}
              >
                复制
              </Button>
            ),
            children: (
              <pre className={styles.jsonCode}>
                {jsonText || '尚未生成 ArgumentMap 结构化数据。'}
              </pre>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ArgumentMapPage;
