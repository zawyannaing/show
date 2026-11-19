import React from 'react';

// Helper to parse inline markdown (**bold**, *italic*, `code`) into React elements
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-neutral-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-neutral-700 dark:text-neutral-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 font-mono text-[0.88em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split lines
  const rawLines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < rawLines.length) {
    const line = rawLines[index];
    const trimmed = line.trim();

    // 1. Empty lines
    if (!trimmed) {
      index++;
      continue;
    }

    // 2. Horizontal divider `---` or `***`
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${index}`} className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />
      );
      index++;
      continue;
    }

    // 3. Blockquote groups (`> ...`)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < rawLines.length && (rawLines[index].trim().startsWith('>') || (rawLines[index].trim() && quoteLines.length > 0 && !rawLines[index].trim().startsWith('#')))) {
        const qLine = rawLines[index].trim().replace(/^>\s?/, '');
        if (qLine) quoteLines.push(qLine);
        index++;
      }

      const fullQuote = quoteLines.join('\n');
      const isRedFlag = fullQuote.includes('⚠️') || fullQuote.toLowerCase().includes('red flags') || fullQuote.includes('အရေးပေါ် သတိပေးချက်');
      const isDisclaimer = fullQuote.includes('📌') || fullQuote.includes('မှတ်ချက်') || fullQuote.includes('Disclaimer');

      if (isRedFlag) {
        elements.push(
          <div
            key={`quote-${index}`}
            className="my-3 p-3 sm:p-3.5 rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-myanmar shadow-xs space-y-1.5"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="leading-relaxed">
                {parseInlineMarkdown(ql)}
              </p>
            ))}
          </div>
        );
      } else if (isDisclaimer) {
        elements.push(
          <div
            key={`quote-${index}`}
            className="my-2 p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/60 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 text-[11px] sm:text-xs font-myanmar space-y-1"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="leading-relaxed">
                {parseInlineMarkdown(ql)}
              </p>
            ))}
          </div>
        );
      } else {
        elements.push(
          <div
            key={`quote-${index}`}
            className="my-2 pl-3 border-l-2 border-emerald-500/70 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm font-myanmar space-y-1"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="leading-relaxed">
                {parseInlineMarkdown(ql)}
              </p>
            ))}
          </div>
        );
      }
      continue;
    }

    // 4. Heading Level 3 (### 🌿 ...)
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h3
          key={`h3-${index}`}
          className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-400 mt-2 mb-1 font-myanmar tracking-tight"
        >
          {parseInlineMarkdown(headingText)}
        </h3>
      );
      index++;
      continue;
    }

    // 5. Heading Level 4 (#### ✅ ..., #### ❌ ..., #### 🍵 ...)
    if (trimmed.startsWith('#### ')) {
      const headingText = trimmed.replace(/^####\s+/, '');
      const isDos = headingText.includes('✅') || headingText.toLowerCase().includes('dos');
      const isDonts = headingText.includes('❌') || headingText.toLowerCase().includes('dont');
      const isRemedy = headingText.includes('🍵') || headingText.toLowerCase().includes('remed');

      let colorClass = 'text-neutral-900 dark:text-neutral-100';
      if (isDos) colorClass = 'text-emerald-700 dark:text-emerald-400';
      if (isDonts) colorClass = 'text-rose-700 dark:text-rose-400';
      if (isRemedy) colorClass = 'text-amber-700 dark:text-amber-400';

      elements.push(
        <h4
          key={`h4-${index}`}
          className={`text-xs sm:text-sm font-bold ${colorClass} mt-3 mb-1 font-myanmar`}
        >
          {parseInlineMarkdown(headingText)}
        </h4>
      );
      index++;
      continue;
    }

    // 6. Heading Level 1 or 2 (# or ##)
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^#{1,2}\s+/, '');
      elements.push(
        <h2
          key={`h2-${index}`}
          className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white mt-2 mb-1 font-myanmar"
        >
          {parseInlineMarkdown(headingText)}
        </h2>
      );
      index++;
      continue;
    }

    // 7. Bullet list item (*, -, •)
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[\*\-\•]\s+/, '');
      elements.push(
        <div key={`bullet-${index}`} className="flex items-start gap-2 pl-1.5 sm:pl-2 my-1 text-xs sm:text-sm leading-relaxed">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
          <div className="flex-1 min-w-0">
            {parseInlineMarkdown(bulletContent)}
          </div>
        </div>
      );
      index++;
      continue;
    }

    // 8. Regular paragraph / italic note / bold title
    elements.push(
      <p key={`p-${index}`} className="text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-myanmar my-1">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
    index++;
  }

  return (
    <div className={`space-y-1 font-myanmar ${className}`}>
      {elements}
    </div>
  );
};
