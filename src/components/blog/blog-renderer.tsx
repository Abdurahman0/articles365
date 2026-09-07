/* eslint-disable @next/next/no-img-element */
// Presentational renderer for a BlogDocument. Pure (no hooks), so it works in
// both the server-rendered public page and the client-side live preview.
// All text is rendered as React children (auto-escaped) — no raw HTML.

import type { BlogBlock, BlogDocument } from "@/types/blog";
import { cn } from "@/lib/utils";

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "heading": {
      const cls = "font-serif font-semibold tracking-tight text-foreground scroll-mt-24";
      if (block.level === 1) return <h1 className={cn(cls, "mt-10 text-3xl sm:text-4xl")}>{block.text}</h1>;
      if (block.level === 2) return <h2 className={cn(cls, "mt-9 text-2xl sm:text-3xl")}>{block.text}</h2>;
      return <h3 className={cn(cls, "mt-7 text-xl sm:text-2xl")}>{block.text}</h3>;
    }
    case "paragraph":
      return <p className="mt-5 text-[17px] leading-8 text-foreground/85">{block.text}</p>;
    case "image":
      return (
        <figure className="my-8">
          <img src={block.url} alt={block.alt ?? ""} loading="lazy"
            className="w-full rounded-2xl border border-border bg-secondary/40 object-contain shadow-[var(--shadow-soft)]" />
          {block.caption && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
    case "callout":
      return (
        <aside className="my-7 rounded-2xl border border-primary/25 bg-[var(--chip)] p-5 sm:p-6">
          {block.title && <p className="eyebrow mb-2 text-primary">{block.title}</p>}
          <p className="text-[15px] leading-7 text-foreground/90">{block.content}</p>
        </aside>
      );
    case "bullet-list":
      return (
        <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-8 text-foreground/85 marker:text-primary">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "ordered-list":
      return (
        <ol className="mt-5 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-foreground/85 marker:text-primary marker:font-semibold">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      );
    case "quote":
      return (
        <blockquote className="my-8 border-l-4 border-primary pl-5 font-serif text-xl italic leading-8 text-foreground/90 sm:text-2xl">
          {block.text}
        </blockquote>
      );
    case "table":
      return (
        <div className="my-7 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            {block.headers.length > 0 && (
              <thead className="bg-secondary/60">
                <tr>{block.headers.map((h, i) => <th key={i} className="border-b border-border px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="odd:bg-secondary/20">
                  {row.map((cell, c) => <td key={c} className="border-b border-border px-4 py-2.5 align-top">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quiz":
      return (
        <section className="my-8 space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          {block.questions.map((q, i) => (
            <div key={i}>
              <p className="font-serif text-lg font-semibold text-foreground">{i + 1}. {q.question}</p>
              <ul className="mt-3 space-y-2">
                {q.options.map((o) => (
                  <li key={o.key} className={cn(
                    "flex gap-3 rounded-xl border px-4 py-2.5 text-[15px]",
                    q.answer && q.answer.toUpperCase() === o.key.toUpperCase()
                      ? "border-success/50 bg-[color-mix(in_srgb,var(--success-c)_12%,transparent)]"
                      : "border-border"
                  )}>
                    <span className="font-semibold text-primary">{o.key}</span>
                    <span className="text-foreground/85">{o.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      );
    default:
      return null;
  }
}

export function BlogBlocks({ blocks }: { blocks: BlogBlock[] }) {
  return <>{blocks.map((b) => <Block key={b.id} block={b} />)}</>;
}

export function BlogArticle({ document, className }: { document: BlogDocument; className?: string }) {
  return (
    <article className={cn("mx-auto w-full max-w-[720px] px-4 sm:px-6", className)}>
      <header className="pt-8">
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
          {document.title}
        </h1>
        {document.subtitle && (
          <p className="mt-4 text-lg leading-8 text-muted-foreground sm:text-xl">{document.subtitle}</p>
        )}
        {document.author && (
          <p className="mt-5 text-sm font-medium text-foreground/70">
            By <span className="text-foreground">{document.author}</span>
          </p>
        )}
      </header>

      {document.coverImage && (
        <img src={document.coverImage} alt="" loading="eager"
          className="mt-7 w-full rounded-2xl border border-border object-cover shadow-[var(--shadow-soft)]" />
      )}

      <div className="pb-16">
        <BlogBlocks blocks={document.blocks} />
      </div>
    </article>
  );
}
