import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify, textFromChildren } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => {
    const text = textFromChildren(children);
    return (
      <h1
        id={slugify(text)}
        className="mt-16 scroll-mt-28 font-display text-3xl font-medium tracking-tight text-fg first:mt-0 sm:text-4xl"
      >
        {children}
      </h1>
    );
  },
  h2: ({ children }) => {
    const text = textFromChildren(children);
    return (
      <h2
        id={slugify(text)}
        className="mt-14 scroll-mt-28 border-t border-border pt-10 font-display text-2xl font-medium tracking-tight text-fg"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const text = textFromChildren(children);
    return (
      <h3
        id={slugify(text)}
        className="mt-10 scroll-mt-28 font-sans text-lg font-medium text-fg"
      >
        {children}
      </h3>
    );
  },
  p: ({ children }) => (
    <p className="mt-4 text-[15px] leading-7 text-fg/90">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:decoration-accent"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-fg/90 marker:text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-7 text-fg/90 marker:text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 border-accent/70 pl-4 text-[15px] leading-7 text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-12 border-border" />,
  strong: ({ children }) => <strong className="font-medium text-fg">{children}</strong>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (!isBlock) {
      return (
        <code
          className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-accent [overflow-wrap:anywhere]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className ?? ""} font-mono text-[12.5px] leading-6 text-fg/90`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mt-5 max-w-full overflow-x-auto rounded-lg bg-surface-2 p-4 text-fg">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-5 max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[28rem] border-collapse text-left text-[13.5px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2 text-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-2.5 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-2.5 align-top text-fg/90">{children}</td>
  ),
};

export function MarkdownDoc({ source }: { source: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </Markdown>
  );
}
