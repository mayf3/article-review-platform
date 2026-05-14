import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownParagraph } from "../types";

interface MarkdownViewerProps {
  markdown: string;
  paragraphs?: MarkdownParagraph[];
  onAddParagraphComment?: (paragraph: MarkdownParagraph) => void;
  renderParagraphAside?: (paragraph: MarkdownParagraph) => ReactNode;
}

export function MarkdownViewer({
  markdown,
  paragraphs = [],
  onAddParagraphComment,
  renderParagraphAside
}: MarkdownViewerProps) {
  let paragraphCursor = 0;

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            const paragraph = paragraphs[paragraphCursor];
            paragraphCursor += 1;

            if (!paragraph || (!onAddParagraphComment && !renderParagraphAside)) {
              return <p>{children}</p>;
            }

            const aside = renderParagraphAside?.(paragraph);

            return (
              <div
                className="group/paragraph my-4 grid scroll-mt-24 gap-2 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start"
                data-paragraph-index={paragraph.index}
              >
                <div className="relative min-w-0">
                  {onAddParagraphComment ? (
                    <button
                      type="button"
                      className="absolute -left-10 top-1 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold leading-none text-accent opacity-0 shadow-sm transition hover:border-accent hover:bg-cyan-50 group-hover/paragraph:opacity-100 md:flex"
                      onClick={() => onAddParagraphComment(paragraph)}
                      title={`给第 ${paragraph.index + 1} 段添加评论`}
                    >
                      +
                    </button>
                  ) : null}
                  <p>{children}</p>
                  {onAddParagraphComment ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-accent md:hidden"
                      onClick={() => onAddParagraphComment(paragraph)}
                    >
                      + 评论
                    </button>
                  ) : null}
                </div>
                {aside ? <div className="min-w-0 md:pl-1">{aside}</div> : <div className="hidden md:block" />}
              </div>
            );
          },
          code({ className, children }) {
            const language = /language-(\w+)/.exec(className ?? "")?.[1];
            const raw = String(children).replace(/\n$/, "");

            if (language && hljs.getLanguage(language)) {
              return (
                <code
                  className={className}
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight(raw, { language }).value
                  }}
                />
              );
            }

            return (
              <code className={className}>
                {children}
              </code>
            );
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
