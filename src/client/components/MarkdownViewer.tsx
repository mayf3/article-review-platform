import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  markdown: string;
}

export function MarkdownViewer({ markdown }: MarkdownViewerProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
