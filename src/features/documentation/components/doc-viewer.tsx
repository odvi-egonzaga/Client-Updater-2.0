import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // or any other style
import { cn } from "@/lib/utils";
import type { DocContent } from "../utils/doc-loader";

interface DocViewerProps {
  doc: DocContent;
  className?: string;
}

export function DocViewer({ doc, className }: DocViewerProps) {
  return (
    <div className={cn("mx-auto max-w-4xl px-6 py-8", className)}>
      <div className="mb-8 border-b pb-4">
        <h1 className="text-foreground text-4xl font-bold tracking-tight">
          {doc.title}
        </h1>
        {doc.frontmatter.description && (
          <p className="text-muted-foreground mt-2 text-xl">
            {doc.frontmatter.description}
          </p>
        )}
      </div>

      <article className="prose prose-slate dark:prose-invert prose-headings:scroll-m-20 prose-h1:text-3xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h1:mb-4 prose-h2:text-2xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-h3:tracking-tight prose-h3:mt-8 prose-h3:mb-4 prose-p:leading-7 prose-p:mb-4 prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-code:relative prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-semibold prose-pre:p-4 prose-pre:rounded-lg prose-pre:bg-muted/50 prose-pre:border max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Override components if needed for custom styling or functionality
            a: ({ node, ...props }) => {
              // Check if link is local markdown file
              const href = props.href || "";
              if (href.startsWith("http")) {
                return (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                    className="text-primary font-medium hover:underline"
                  />
                );
              }
              // Convert relative markdown links to ?doc= links
              // This is a bit complex as we need to resolve relative paths against current doc ID
              // For now, let's just leave them as is, or handle basic cases
              return (
                <a
                  {...props}
                  className="text-primary font-medium hover:underline"
                />
              );
            },
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-primary mt-6 border-l-2 pl-6 italic"
                {...props}
              />
            ),
            table: ({ node, ...props }) => (
              <div className="my-6 w-full overflow-y-auto">
                <table className="w-full" {...props} />
              </div>
            ),
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
