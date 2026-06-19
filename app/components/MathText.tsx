'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderMathInText(text: string): string {
  // Replace block math $$...$$ first
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return _; }
  });

  // Replace inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return _; }
  });

  // Replace **bold** with <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Replace --- with a divider
  text = text.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #D3F0E6;margin:8px 0"/>');

  // Replace newlines with <br>
  text = text.replace(/\n/g, '<br/>');

  return text;
}

export default function MathText({ content, color = '#085041' }: { content: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = renderMathInText(content);
    }
  }, [content]);

  return (
    <div
      ref={ref}
      style={{ color, fontSize: '15px', lineHeight: 1.7 }}
    />
  );
}