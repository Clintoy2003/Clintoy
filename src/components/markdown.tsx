"use client";

import { Fragment, useState, type ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== "");
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const safe = /^(https?:|mailto:)/.test(link[2]);
      return (
        <a key={key} href={safe ? link[2] : "#"} target={safe ? "_blank" : undefined} rel={safe ? "noreferrer noopener" : undefined}>
          {link[1]}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-3">
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-[rgba(216,237,138,0.2)] bg-[#0f1c16] px-3 py-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#b9c9a8]">{language || "code"}</span>
        <button
          type="button"
          className="rounded-full border border-[rgba(216,237,138,0.25)] px-2 py-0.5 text-[0.65rem] font-medium text-[#e8f0da] transition hover:border-[#d8ed8a] hover:text-[#d8ed8a]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="!my-0 !rounded-t-none">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  const pushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return;
    const text = buffer.join(" ").trim();
    if (text) blocks.push(<p key={`p-${blocks.length}`}>{inline(text, `p-${blocks.length}`)}</p>);
    buffer.length = 0;
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<CodeBlock key={`code-${blocks.length}`} language={language} code={code.join("\n")} />);
      continue;
    }

    if (line.trim() === "---" || line.trim() === "***") {
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const text = heading[2];
      const level = heading[1].length;
      blocks.push(
        level <= 2 ? (
          <h2 key={`h-${blocks.length}`}>{inline(text, `h-${blocks.length}`)}</h2>
        ) : (
          <h3 key={`h-${blocks.length}`}>{inline(text, `h-${blocks.length}`)}</h3>
        ),
      );
      index += 1;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`q-${blocks.length}`}>
          {quote.map((row, rowIndex) => (
            <p key={rowIndex}>{inline(row, `q-${blocks.length}-${rowIndex}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1])) {
      const header = line.split("|").slice(1, -1).map((cell) => cell.trim());
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        rows.push(lines[index].split("|").slice(1, -1).map((cell) => cell.trim()));
        index += 1;
      }
      blocks.push(
        <div key={`table-${blocks.length}`} className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex}>{inline(cell, `th-${blocks.length}-${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{inline(cell, `td-${blocks.length}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*([-*+]|\d+\.)\s+/, ""));
        index += 1;
      }
      const children = items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `li-${blocks.length}-${itemIndex}`)}</li>);
      blocks.push(ordered ? <ol key={`ol-${blocks.length}`}>{children}</ol> : <ul key={`ul-${blocks.length}`}>{children}</ul>);
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const buffer: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].trim().startsWith("```") &&
      !lines[index].trim().startsWith("#") &&
      !lines[index].trim().startsWith(">") &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[index]) &&
      !/^\s*\|.*\|\s*$/.test(lines[index]) &&
      lines[index].trim() !== "---"
    ) {
      buffer.push(lines[index]);
      index += 1;
    }
    pushParagraph(buffer);
  }

  return <div className="prose-clintoy">{blocks}</div>;
}
