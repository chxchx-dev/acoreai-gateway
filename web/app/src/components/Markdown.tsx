import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

let _wc = 0;

function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

function nextWord(
  word: string,
  activeIdx: number | undefined,
  streamFromIdx: number | undefined,
): React.ReactNode {
  if (activeIdx === undefined && streamFromIdx === undefined) return word;
  const i = _wc++;
  if (i === activeIdx) return <span key={`w${i}`} className="tts-word active">{word}</span>;
  if (streamFromIdx !== undefined && i >= streamFromIdx) {
    return <span key={`w${i}`} className="stream-word active">{word}</span>;
  }
  return word;
}

function textNodes(
  raw: string,
  activeIdx: number | undefined,
  streamFromIdx: number | undefined,
): React.ReactNode[] {
  if (activeIdx === undefined && streamFromIdx === undefined) return [raw];
  return raw
    .split(/(\s+)/)
    .map((t) => (t.trim() ? nextWord(t, activeIdx, streamFromIdx) : t));
}

function parseInline(
  text: string,
  activeIdx?: number,
  streamFromIdx?: number,
): React.ReactNode {
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...textNodes(text.slice(last, match.index), activeIdx, streamFromIdx));
    }
    const raw = match[0];
    const inner = raw.startsWith('**') ? raw.slice(2, -2) : raw.slice(1, -1);
    const innerNodes = textNodes(inner, activeIdx, streamFromIdx);
    if (raw.startsWith('**'))     parts.push(<strong key={key++}>{innerNodes}</strong>);
    else if (raw.startsWith('*')) parts.push(<em key={key++}>{innerNodes}</em>);
    else                          parts.push(<code key={key++} className="md-code-inline">{innerNodes}</code>);
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(...textNodes(text.slice(last), activeIdx, streamFromIdx));
  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'código'}</span>
        <button className="md-code-copy" onClick={copy} type="button">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function parseCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

function isTableSep(line: string): boolean {
  return /^[\|\s\-:]+$/.test(line.trim()) && line.includes('-');
}

function parseHeading(line: string): { level: number; text: string } | null {
  const match = line.match(/^\s*(#{1,6})\s*(.+?)\s*$/);
  if (!match) return null;
  return {
    level: Math.min(match[1].length, 6),
    text: match[2],
  };
}

export interface MarkdownProps {
  content: string;
  activeWordIdx?: number;
  streaming?: boolean;
}

export function Markdown({ content, activeWordIdx, streaming = false }: MarkdownProps) {
  _wc = 0;
  const streamFromIdx =
    streaming && activeWordIdx === undefined
      ? Math.max(0, countWords(content) - 5)
      : undefined;
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      const code = codeLines.join('\n');
      // Avanzar contador TTS para no desincronizar
      if (activeWordIdx !== undefined || streamFromIdx !== undefined) {
        code.split(/\s+/).forEach((w) => { if (w) _wc++; });
      }
      nodes.push(<CodeBlock key={`cb${i}`} lang={lang} code={code} />);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = parseCells(line);
      i += 2; // saltar cabecera + separador
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) { rows.push(parseCells(lines[i])); i++; }
      nodes.push(
        <div key={`tbl${i}`} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>{headers.map((h, j) => <th key={j}>{parseInline(h, activeWordIdx, streamFromIdx)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => <td key={ci}>{parseInline(c, activeWordIdx, streamFromIdx)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const bqLines: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(<p key={i}>{parseInline(lines[i].slice(2), activeWordIdx, streamFromIdx)}</p>);
        i++;
      }
      nodes.push(<blockquote key={`bq${i}`} className="md-blockquote">{bqLines}</blockquote>);
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      const headingNode = parseInline(heading.text, activeWordIdx, streamFromIdx);
      if (heading.level <= 1) nodes.push(<h1 key={i}>{headingNode}</h1>);
      else if (heading.level === 2) nodes.push(<h2 key={i}>{headingNode}</h2>);
      else nodes.push(<h3 key={i}>{headingNode}</h3>);

    } else if (/^[-*+] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].slice(2), activeWordIdx, streamFromIdx)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`}>{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].replace(/^\d+\. /, ''), activeWordIdx, streamFromIdx)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol${i}`}>{items}</ol>);
      continue;

    } else if (/^[-*]{3,}$/.test(line.trim())) {
      nodes.push(<hr key={i} />);

    } else if (line.trim() !== '') {
      nodes.push(<p key={i}>{parseInline(line, activeWordIdx, streamFromIdx)}</p>);
    }

    i++;
  }

  return <div className="md">{nodes}</div>;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^> /gm, '')
    .replace(/^[-*]{3,}$/gm, '')
    .replace(/\|[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    // Eliminar emojis para que el TTS no los lea
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '')
    .replace(/  +/g, ' ')
    .trim();
}
