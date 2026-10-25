import type { LegalDocument } from "@/lib/content-api";

/**
 * Renders a legal document written in the admin.
 *
 * The body is a plain textarea, so it is treated as text — never as HTML —
 * and only its structure is interpreted: a blank line starts a new paragraph,
 * and a short line ending without punctuation is treated as a heading, which
 * is how people naturally type these documents.
 */
export default function LegalBody({ document }: { document: LegalDocument }) {
  const blocks = document.body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        const isHeading = block.length < 80 && !/[.!?:;]$/.test(block) && !block.includes("\n");
        return isHeading ? (
          <h2 key={i} className="text-[19px] font-semibold text-ink mb-2 mt-8">
            {block}
          </h2>
        ) : (
          <p key={i} className="text-[14.5px] leading-relaxed text-ink-muted whitespace-pre-line mb-4">
            {block}
          </p>
        );
      })}
      {document.updatedAt && (
        <p className="text-[12.5px] text-ink-muted/70 mt-10 pt-4 border-t border-line/60">
          Last updated{" "}
          {new Date(document.updatedAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      )}
    </>
  );
}
