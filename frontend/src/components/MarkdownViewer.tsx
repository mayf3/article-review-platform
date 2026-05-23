import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Typography } from 'antd';

interface MarkdownViewerProps {
  content: string;
  selectedParagraph?: number | null;
  onParagraphClick?: (index: number) => void;
  paragraphs?: Array<{ index: number; lineStart: number; lineEnd: number; text: string }>;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  selectedParagraph,
  onParagraphClick,
}) => {
  const lines = content.split('\n');
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join('\n'));
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph();
    } else {
      currentParagraph.push(line);
    }
  }
  flushParagraph();

  return (
    <div style={{ lineHeight: 1.8, fontSize: 15 }}>
      {paragraphs.map((para, idx) => {
        const isSelected = selectedParagraph === idx;
        return (
          <div
            key={idx}
            data-paragraph-index={idx}
            onClick={() => onParagraphClick?.(idx)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 4,
              cursor: onParagraphClick ? 'pointer' : 'default',
              background: isSelected ? '#e6f7ff' : 'transparent',
              borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (onParagraphClick) {
                (e.currentTarget as HTMLElement).style.background = isSelected
                  ? '#e6f7ff'
                  : '#fafafa';
              }
            }}
            onMouseLeave={(e) => {
              if (onParagraphClick && !isSelected) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeStr = String(children).replace(/\n$/, '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                      >
                        {codeStr}
                      </SyntaxHighlighter>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <Typography.Title level={1} style={{ marginTop: 16, marginBottom: 8 }}>
                    {children}
                  </Typography.Title>
                ),
                h2: ({ children }) => (
                  <Typography.Title level={2} style={{ marginTop: 14, marginBottom: 6 }}>
                    {children}
                  </Typography.Title>
                ),
                h3: ({ children }) => (
                  <Typography.Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
                    {children}
                  </Typography.Title>
                ),
                p: ({ children }) => <Typography.Paragraph>{children}</Typography.Paragraph>,
                a: ({ href, children }) => (
                  <Typography.Link href={href} target="_blank">
                    {children}
                  </Typography.Link>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    style={{
                      borderLeft: '4px solid #d9d9d9',
                      paddingLeft: 16,
                      margin: '8px 0',
                      color: '#666',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {para}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownViewer;
