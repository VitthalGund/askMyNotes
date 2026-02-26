import pdf from "pdf-parse";

export interface ParsedChunk {
    content: string;
    pageNumber: number;
    chunkIndex: number;
    embedding?: number[];
}

/**
 * Parse a PDF buffer and extract text split into chunks
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedChunk[]> {
    const data = await pdf(buffer);
    const chunks: ParsedChunk[] = [];

    const fullText = data.text;
    const numPages = data.numpages || 1;

    // Try to split by page-like boundaries (form feeds)
    const rawPages = fullText.split(/\f/);

    const pages =
        rawPages.length >= numPages
            ? rawPages
            : splitTextEvenly(fullText, numPages);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const pageText = pages[pageIdx].trim();
        if (!pageText) continue;

        const pageChunks = chunkText(pageText, 500);
        for (let chunkIdx = 0; chunkIdx < pageChunks.length; chunkIdx++) {
            chunks.push({
                content: pageChunks[chunkIdx],
                pageNumber: pageIdx + 1,
                chunkIndex: chunkIdx,
            });
        }
    }

    return chunks;
}

/**
 * Parse a TXT file content into chunks
 */
export function parseTXT(text: string): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    const textChunks = chunkText(text, 500);

    for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
            content: textChunks[i],
            pageNumber: 1,
            chunkIndex: i,
        });
    }

    return chunks;
}

/**
 * Split text into chunks of approximately `maxTokens` words
 */
function chunkText(text: string, maxTokens: number): string[] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += maxTokens) {
        const chunk = words.slice(i, i + maxTokens).join(" ");
        if (chunk.trim()) {
            chunks.push(chunk.trim());
        }
    }

    return chunks;
}

function splitTextEvenly(text: string, parts: number): string[] {
    const len = text.length;
    const partSize = Math.ceil(len / parts);
    const result: string[] = [];

    for (let i = 0; i < len; i += partSize) {
        result.push(text.slice(i, i + partSize));
    }

    return result;
}
