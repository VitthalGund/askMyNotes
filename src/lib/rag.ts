import dbConnect from "@/lib/mongodb";
import DocModel from "@/models/Document";
import { generateEmbedding } from "@/lib/gemini";

interface ChunkWithMeta {
    content: string;
    fileName: string;
    fileUrl?: string;
    pageNumber: number;
    chunkIndex: number;
    score: number;
}

// ─── Cosine Similarity ────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

// ─── Retrieval with Embeddings ─────────────────────────────────────────────

/**
 * Retrieve relevant chunks using Gemini embeddings + cosine similarity
 * Falls back to keyword matching if embeddings are not available
 */
export async function retrieveRelevantChunks(
    subjectId: string,
    query: string,
    topK: number = 10
): Promise<ChunkWithMeta[]> {
    await dbConnect();

    const documents = await DocModel.find({ subjectId });

    if (documents.length === 0) {
        return [];
    }

    // Check if any chunks have embeddings
    const hasEmbeddings = documents.some((doc) =>
        doc.chunks.some((chunk) => chunk.embedding && chunk.embedding.length > 0)
    );

    if (hasEmbeddings) {
        return retrieveByEmbedding(documents, query, topK);
    }

    // Fallback: keyword matching for documents uploaded before embeddings were enabled
    return retrieveByKeyword(documents, query, topK);
}

/**
 * Embedding-based retrieval using cosine similarity
 */
async function retrieveByEmbedding(
    documents: InstanceType<typeof DocModel>[],
    query: string,
    topK: number
): Promise<ChunkWithMeta[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    const scoredChunks: ChunkWithMeta[] = [];

    for (const doc of documents) {
        for (const chunk of doc.chunks) {
            if (!chunk.embedding || chunk.embedding.length === 0) continue;

            const score = cosineSimilarity(queryEmbedding, chunk.embedding);

            scoredChunks.push({
                content: chunk.content,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                pageNumber: chunk.pageNumber,
                chunkIndex: chunk.chunkIndex,
                score,
            });
        }
    }

    // Sort by similarity descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Filter out very low similarity (below threshold)
    const threshold = 0.3;
    const filtered = scoredChunks.filter((c) => c.score >= threshold);

    return filtered.slice(0, topK);
}

/**
 * Keyword-based fallback retrieval (for documents without embeddings)
 */
function retrieveByKeyword(
    documents: InstanceType<typeof DocModel>[],
    query: string,
    topK: number
): ChunkWithMeta[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scoredChunks: ChunkWithMeta[] = [];

    for (const doc of documents) {
        for (const chunk of doc.chunks) {
            const score = computeKeywordScore(queryTokens, chunk.content);
            if (score > 0) {
                scoredChunks.push({
                    content: chunk.content,
                    fileName: doc.fileName,
                    fileUrl: doc.fileUrl,
                    pageNumber: chunk.pageNumber,
                    chunkIndex: chunk.chunkIndex,
                    score,
                });
            }
        }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK);
}

/**
 * Retrieve all chunks for a subject (for quiz generation)
 */
export async function retrieveAllChunks(
    subjectId: string
): Promise<ChunkWithMeta[]> {
    await dbConnect();

    const documents = await DocModel.find({ subjectId });

    const allChunks: ChunkWithMeta[] = [];

    for (const doc of documents) {
        for (const chunk of doc.chunks) {
            allChunks.push({
                content: chunk.content,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                pageNumber: chunk.pageNumber,
                chunkIndex: chunk.chunkIndex,
                score: 1,
            });
        }
    }

    return allChunks;
}

// ─── Keyword Utilities (fallback) ─────────────────────────────────────────

function tokenize(text: string): string[] {
    const stopWords = new Set([
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "need", "dare", "ought",
        "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "as", "into", "through", "during", "before", "after", "above", "below",
        "between", "out", "off", "over", "under", "again", "further", "then",
        "once", "here", "there", "when", "where", "why", "how", "all", "each",
        "every", "both", "few", "more", "most", "other", "some", "such", "no",
        "nor", "not", "only", "own", "same", "so", "than", "too", "very",
        "just", "because", "but", "and", "or", "if", "while", "although",
        "this", "that", "these", "those", "i", "me", "my", "myself", "we",
        "our", "ours", "you", "your", "he", "him", "his", "she", "her",
        "it", "its", "they", "them", "their", "what", "which", "who", "whom",
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !stopWords.has(w));
}

function computeKeywordScore(queryTokens: string[], chunkContent: string): number {
    const chunkTokens = tokenize(chunkContent);
    if (chunkTokens.length === 0) return 0;

    const chunkTokenSet = new Set(chunkTokens);
    let matchCount = 0;
    for (const qt of queryTokens) {
        if (chunkTokenSet.has(qt)) matchCount++;
    }

    return matchCount / queryTokens.length;
}
