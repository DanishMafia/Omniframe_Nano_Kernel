/**
 * Static File Parser
 *
 * Converts local files (PDF, Markdown, plain text, JSON) into plain-text
 * context suitable for direct injection into the model's context window.
 *
 * PDF parsing uses the browser's built-in PDF rendering capabilities
 * via a canvas-based text extraction approach. For simplicity and zero
 * external dependencies, we extract text layer data from PDF.js (which
 * browsers already ship for <embed>/<iframe> rendering).
 */

import type { ParsedDocument } from '../types';
import { saveDocument } from '../storage/opfs-store';

// Rough estimate: 1 token ≈ 4 chars for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function parseMarkdown(raw: string): string {
  // Strip HTML tags if mixed content
  return raw.replace(/<[^>]+>/g, '').trim();
}

function parseJSON(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

/**
 * Extract text from a PDF file.
 * Uses pdf.js dynamically loaded from CDN if not available.
 */
async function parsePDF(file: File): Promise<string> {
  // Dynamic import of pdf.js from CDN
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str ?? '')
      .join(' ');
    pages.push(`[Page ${i}]\n${pageText}`);
  }

  return pages.join('\n\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfJsPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPdfJs(): Promise<any> {
  if (pdfJsPromise) return pdfJsPromise;
  pdfJsPromise = new Promise((resolve, reject) => {
    // Check if already available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).pdfjsLib) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs';
    script.type = 'module';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs';
        resolve(lib);
      } else {
        reject(new Error('pdf.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js'));
    document.head.appendChild(script);
  });
  return pdfJsPromise;
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  let content: string;
  let type: ParsedDocument['type'];

  switch (ext) {
    case 'pdf': {
      content = await parsePDF(file);
      type = 'pdf';
      break;
    }
    case 'md':
    case 'markdown': {
      const raw = await file.text();
      content = parseMarkdown(raw);
      type = 'markdown';
      break;
    }
    case 'json': {
      const raw = await file.text();
      content = parseJSON(raw);
      type = 'json';
      break;
    }
    default: {
      content = await file.text();
      type = 'text';
    }
  }

  const doc: ParsedDocument = {
    name,
    type,
    content,
    tokenEstimate: estimateTokens(content),
    parsedAt: Date.now(),
  };

  // Persist to IndexedDB
  await saveDocument({ id: name, ...doc });

  return doc;
}

/**
 * Build a context injection string from parsed documents.
 * Respects a token budget to avoid overflowing the context window.
 */
export function buildDocumentContext(
  docs: ParsedDocument[],
  maxTokens: number,
): string {
  if (docs.length === 0) return '';

  let totalTokens = 0;
  const parts: string[] = ['=== LOADED DOCUMENTS ===\n'];

  for (const doc of docs) {
    const header = `\n--- ${doc.name} (${doc.type}) ---\n`;
    const headerTokens = estimateTokens(header);

    if (totalTokens + headerTokens + doc.tokenEstimate > maxTokens) {
      // Truncate document content to fit
      const remainingTokens = maxTokens - totalTokens - headerTokens;
      if (remainingTokens > 100) {
        const truncatedChars = remainingTokens * 4;
        parts.push(header + doc.content.slice(0, truncatedChars) + '\n[...truncated]');
      }
      break;
    }

    parts.push(header + doc.content);
    totalTokens += headerTokens + doc.tokenEstimate;
  }

  parts.push('\n=== END DOCUMENTS ===');
  return parts.join('');
}
