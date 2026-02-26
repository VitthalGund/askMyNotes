import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Multi-Key Gemini + Ollama LLM Client ────────────────────────────────

const LLM_PROVIDER = process.env.LLM_PROVIDER || "gemini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

// Parse comma-separated Gemini API keys
function getGeminiKeys(): string[] {
    const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    return raw
        .replace(/"/g, "")
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
}

// Remove global tracked index to avoid Promise.all async race collisions
// We will assign a random start index per request instead.
const deadKeys = new Set<string>();


/**
 * Check if an error is rotatable (rate limit, quota, auth)
 */
function isRotatableError(error: Error): boolean {
    const errMsg = error.message.toLowerCase();
    return (
        errMsg.includes("429") ||
        errMsg.includes("rate") ||
        errMsg.includes("quota") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("limit") ||
        errMsg.includes("unauthorized") ||
        errMsg.includes("403") ||
        errMsg.includes("api key")
    );
}

/**
 * Check if the error is permanent (like a leaked or deleted key)
 */
function isDeadKeyError(error: Error): boolean {
    const errMsg = error.message.toLowerCase();
    return errMsg.includes("leaked") || errMsg.includes("403") || errMsg.includes("unauthorized") || errMsg.includes("api key not valid");
}

// ─── Embedding Functions ──────────────────────────────────────────────────

/**
 * Generate embedding for a single text using Gemini embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const keys = getGeminiKeys();
    const maxAttempts = keys.length;
    let lastError: Error | null = null;
    const startIndex = Math.floor(Math.random() * keys.length);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const keyIndex = (startIndex + attempt) % keys.length;
        const currentKey = keys[keyIndex];

        // Skip explicitly dead keys so we don't spam 403s
        if (deadKeys.has(currentKey)) continue;

        try {
            const genAI = new GoogleGenerativeAI(currentKey);
            const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[Embedding] Key ${keyIndex + 1}/${keys.length} failed with error: ${lastError.message}`);

            if (isDeadKeyError(lastError)) {
                console.warn(`[Embedding] Marking Key ${keyIndex + 1} as permanently dead.`);
                deadKeys.add(currentKey);
                continue;
            }

            if (isRotatableError(lastError)) {
                console.warn(`[Embedding] Trying next key...`);
                continue;
            }
            // If it's a structural or network error, we want to try the next key anyway, 
            // as this could be an intermittent issue or a bad key.
            continue;
        }
    }

    if (deadKeys.size >= keys.length) {
        throw new Error(`All ${keys.length} configured Gemini API keys have been marked as permanently dead (Likely 403 Forbidden/Leaked). Please update .env.local with fresh API keys.`);
    }

    throw new Error(`All keys exhausted for embedding. Last error: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts in batch (with key rotation)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
        const emb = await generateEmbedding(text);
        embeddings.push(emb);
    }
    return embeddings;
}

// ─── LLM Call Functions ───────────────────────────────────────────────────

/**
 * Call LLM with automatic provider selection and key rotation
 */
async function callLLM(prompt: string): Promise<string> {
    if (LLM_PROVIDER === "ollama") {
        return callOllama(prompt);
    }
    return callGeminiWithFailover(prompt);
}

async function callGeminiWithFailover(prompt: string): Promise<string> {
    const keys = getGeminiKeys();
    const maxAttempts = keys.length;
    let lastError: Error | null = null;
    const startIndex = Math.floor(Math.random() * keys.length);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const keyIndex = (startIndex + attempt) % keys.length;
        const currentKey = keys[keyIndex];

        if (deadKeys.has(currentKey)) continue;

        try {
            const genAI = new GoogleGenerativeAI(currentKey);
            const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            return text;
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[Gemini] Key ${keyIndex + 1}/${keys.length} failed with error: ${lastError.message}`);

            if (isDeadKeyError(lastError)) {
                console.warn(`[Gemini] Marking Key ${keyIndex + 1} as permanently dead.`);
                deadKeys.add(currentKey);
                continue;
            }

            if (isRotatableError(lastError)) {
                console.warn(`[Gemini] Trying next key...`);
                continue;
            }
            continue;
        }
    }

    if (deadKeys.size >= keys.length) {
        throw new Error(`All ${keys.length} Gemini API keys have been marked as permanently dead (Leaked/403). Please get new keys bounds inside .env.local!`);
    }

    throw new Error(`All ${keys.length} Gemini API keys exhausted. Last error: ${lastError?.message}`);
}

async function callOllama(prompt: string): Promise<string> {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.3, num_predict: 4096 },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return (data.response || "").trim();
}

// ─── Interfaces ───────────────────────────────────────────────────────────

interface ChunkWithMeta {
    content: string;
    fileName: string;
    fileUrl?: string;
    pageNumber: number;
    chunkIndex: number;
    score: number;
}

interface AnswerResult {
    answer: string;
    citations: { fileName: string; fileUrl?: string; pageNumber: number; chunkIndex: number }[];
    confidence: "High" | "Medium" | "Low";
    confidenceExplanation: string;
    evidenceSnippets: string[];
    notFound: boolean;
}

interface QuizResult {
    mcqs: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
        citation: { fileName: string; pageNumber: number; chunkIndex: number };
    }[];
    shortAnswer: {
        question: string;
        modelAnswer: string;
        citation: { fileName: string; pageNumber: number; chunkIndex: number };
    }[];
}

// ─── Confidence Explanation (SHAP/LIME-inspired) ──────────────────────────

/**
 * Generate a SHAP/LIME-inspired confidence explanation based on similarity scores
 */
export function computeConfidenceExplanation(
    chunks: ChunkWithMeta[],
    confidence: "High" | "Medium" | "Low"
): string {
    if (chunks.length === 0) {
        return "No relevant content found in uploaded notes. Confidence is Low because no source material matches the query.";
    }

    const scores = chunks.map((c) => c.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const topChunk = chunks[0];

    // SHAP-like feature contributions
    const factors: string[] = [];

    // Factor 1: Top similarity score
    if (maxScore > 0.85) {
        factors.push(`Strong semantic match (top similarity: ${(maxScore * 100).toFixed(1)}%)`);
    } else if (maxScore > 0.6) {
        factors.push(`Moderate semantic match (top similarity: ${(maxScore * 100).toFixed(1)}%)`);
    } else {
        factors.push(`Weak semantic match (top similarity: ${(maxScore * 100).toFixed(1)}%)`);
    }

    // Factor 2: Score distribution spread
    const spread = maxScore - (scores[scores.length - 1] || 0);
    if (spread < 0.15) {
        factors.push("Multiple chunks equally relevant → distributed evidence");
    } else {
        factors.push(`Concentrated evidence in top source: ${topChunk.fileName} (Page ${topChunk.pageNumber})`);
    }

    // Factor 3: Number of supporting chunks
    const strongChunks = scores.filter((s) => s > 0.5).length;
    factors.push(`${strongChunks} chunk(s) with >50% relevance out of ${chunks.length} retrieved`);

    // Factor 4: Average relevance
    factors.push(`Average chunk relevance: ${(avgScore * 100).toFixed(1)}%`);

    const header = `Confidence: ${confidence} — `;
    const reason =
        confidence === "High"
            ? "High semantic similarity scores and strong evidence coverage."
            : confidence === "Medium"
                ? "Partial matches found; answer may not be fully supported."
                : "Low semantic overlap; sources may not directly address the question.";

    return `${header}${reason}\n\nContributing factors (SHAP-inspired analysis):\n• ${factors.join("\n• ")}`;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a grounded answer from retrieved context chunks
 */
export async function generateAnswer(
    query: string,
    chunks: ChunkWithMeta[],
    subjectName: string,
    conversationHistory: { role: string; content: string }[] = []
): Promise<AnswerResult> {
    if (chunks.length === 0) {
        return {
            answer: `Not found in your notes for ${subjectName}`,
            citations: [],
            confidence: "Low",
            confidenceExplanation: computeConfidenceExplanation([], "Low"),
            evidenceSnippets: [],
            notFound: true,
        };
    }

    const contextStr = chunks
        .map(
            (c, i) =>
                `[Source ${i + 1}: ${c.fileName}, Page ${c.pageNumber}, Chunk ${c.chunkIndex}, Similarity: ${(c.score * 100).toFixed(1)}%]\n${c.content}`
        )
        .join("\n\n---\n\n");

    const historyStr = conversationHistory
        .map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.content}`)
        .join("\n");

    const avgSim = chunks.reduce((a, c) => a + c.score, 0) / chunks.length;
    const simHint = avgSim > 0.7 ? "The similarity scores are high." : avgSim > 0.4 ? "The similarity scores are moderate." : "The similarity scores are low, exercise caution.";

    const prompt = `You are a study assistant. Answer the student's question STRICTLY using ONLY the provided source material. Do NOT use any external knowledge.

RULES:
1. If the sources do not contain enough information to answer, respond EXACTLY with: "Not found in your notes for ${subjectName}"
2. Cite your sources using the source numbers provided (e.g., [Source 1], [Source 2])
3. Rate your confidence as High, Medium, or Low. ${simHint}
4. Extract the key evidence snippets you used
5. Explain WHY you assigned that confidence level
6. Format your answer with rich Markdown. USE tables, lists, and \`\`\`mermaid\`\`\` diagrams abundantly to visually explain complex concepts!

SOURCE MATERIAL:
${contextStr}

${historyStr ? `CONVERSATION HISTORY:\n${historyStr}\n` : ""}

STUDENT'S QUESTION: ${query}

Respond in this EXACT JSON format (the outer container must be raw JSON):
{
  "answer": "Your detailed answer here with [Source N] citations inline. Use markdown and mermaid charts heavily inside this string. Ensure newlines are escaped correctly.",
  "citedSources": [1, 2],
  "confidence": "High",
  "confidenceReason": "Brief explanation why this confidence level was assigned",
  "evidenceSnippets": ["key quote from source 1", "key quote from source 2"],
  "notFound": false
}`;

    const responseText = await callLLM(prompt);

    try {
        let cleaned = responseText;
        // Attempt to strictly extract a JSON object ignoring pre-text or post-text reasoning outputted by Ollama
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        } else {
            cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        }

        const parsed = JSON.parse(cleaned);

        if (parsed.notFound || parsed.answer.includes("Not found in your notes")) {
            return {
                answer: `Not found in your notes for ${subjectName}`,
                citations: [],
                confidence: "Low",
                confidenceExplanation: computeConfidenceExplanation(chunks, "Low"),
                evidenceSnippets: [],
                notFound: true,
            };
        }

        const citations = (parsed.citedSources || [])
            .filter((idx: number) => idx >= 1 && idx <= chunks.length)
            .map((idx: number) => ({
                fileName: chunks[idx - 1].fileName,
                fileUrl: chunks[idx - 1].fileUrl,
                pageNumber: chunks[idx - 1].pageNumber,
                chunkIndex: chunks[idx - 1].chunkIndex,
            }));

        const conf = (parsed.confidence || "Medium") as "High" | "Medium" | "Low";
        const shapExplanation = computeConfidenceExplanation(chunks, conf);
        const llmReason = parsed.confidenceReason || "";

        return {
            answer: parsed.answer || responseText,
            citations,
            confidence: conf,
            confidenceExplanation: `${shapExplanation}\n\nAI reasoning: ${llmReason}`,
            evidenceSnippets: parsed.evidenceSnippets || [],
            notFound: false,
        };
    } catch {
        if (responseText.toLowerCase().includes("not found")) {
            return {
                answer: `Not found in your notes for ${subjectName}`,
                citations: [],
                confidence: "Low",
                confidenceExplanation: computeConfidenceExplanation(chunks, "Low"),
                evidenceSnippets: [],
                notFound: true,
            };
        }

        return {
            answer: responseText,
            citations: chunks.slice(0, 3).map((c) => ({
                fileName: c.fileName,
                pageNumber: c.pageNumber,
                chunkIndex: c.chunkIndex,
            })),
            confidence: "Low",
            confidenceExplanation: computeConfidenceExplanation(chunks, "Low"),
            evidenceSnippets: [],
            notFound: false,
        };
    }
}

/**
 * Generate quiz questions from context chunks
 */
export async function generateQuiz(
    chunks: ChunkWithMeta[],
    subjectName: string,
    difficulty: string = "medium"
): Promise<QuizResult> {
    const contextStr = chunks
        .map(
            (c, i) =>
                `[Source ${i + 1}: ${c.fileName}, Page ${c.pageNumber}, Chunk ${c.chunkIndex}]\n${c.content}`
        )
        .join("\n\n---\n\n");

    const difficultyInstruction = difficulty === "adaptive" || difficulty === "increasing"
        ? "Start with basic foundational questions and progressively make each question harder (increasing difficulty level)."
        : `Generate questions appropriate for a '${difficulty}' difficulty level.`;

    const prompt = `You are a study assistant. Generate quiz questions from the following study material for the subject "${subjectName}".

DIFFICULTY NOTE:
${difficultyInstruction}

SOURCE MATERIAL:
${contextStr}

Generate EXACTLY:
- 5 multiple-choice questions (MCQs) with 4 options each, the correct answer index (0-3), a brief explanation, and a citation
- 3 short-answer questions with model answers and citations

All questions must be based STRICTLY on the provided source material. Include source references.

Respond in this EXACT JSON format (no markdown, no code fences):
{
  "mcqs": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct",
      "citedSource": 1
    }
  ],
  "shortAnswer": [
    {
      "question": "Question text?",
      "modelAnswer": "Detailed model answer",
      "citedSource": 1
    }
  ]
}`;

    const responseText = await callLLM(prompt);

    try {
        const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const mcqs = (parsed.mcqs || []).map(
            (q: { question: string; options: string[]; correctIndex: number; explanation: string; citedSource: number }) => ({
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                citation:
                    q.citedSource >= 1 && q.citedSource <= chunks.length
                        ? {
                            fileName: chunks[q.citedSource - 1].fileName,
                            pageNumber: chunks[q.citedSource - 1].pageNumber,
                            chunkIndex: chunks[q.citedSource - 1].chunkIndex,
                        }
                        : { fileName: "Unknown", pageNumber: 0, chunkIndex: 0 },
            })
        );

        const shortAnswer = (parsed.shortAnswer || []).map(
            (q: { question: string; modelAnswer: string; citedSource: number }) => ({
                question: q.question,
                modelAnswer: q.modelAnswer,
                citation:
                    q.citedSource >= 1 && q.citedSource <= chunks.length
                        ? {
                            fileName: chunks[q.citedSource - 1].fileName,
                            pageNumber: chunks[q.citedSource - 1].pageNumber,
                            chunkIndex: chunks[q.citedSource - 1].chunkIndex,
                        }
                        : { fileName: "Unknown", pageNumber: 0, chunkIndex: 0 },
            })
        );

        return { mcqs, shortAnswer };
    } catch {
        return { mcqs: [], shortAnswer: [] };
    }
}

/**
 * Generate active recall flashcards from context chunks
 */
export async function generateActiveRecall(
    chunks: ChunkWithMeta[],
    subjectName: string
): Promise<{ question: string; answer: string; citation: { fileName: string; pageNumber: number; chunkIndex: number } }[]> {
    const contextStr = chunks
        .map(
            (c, i) =>
                `[Source ${i + 1}: ${c.fileName}, Page ${c.pageNumber}, Chunk ${c.chunkIndex}]\n${c.content}`
        )
        .join("\n\n---\n\n");

    const prompt = `You are a study assistant creating an Active Recall session. Generate 5 rapid-fire flashcard questions based on the following material for "${subjectName}".

SOURCE MATERIAL:
${contextStr}

Generate EXACTLY 5 quick, single-concept questions and their concise answers.

Respond in this EXACT JSON format:
[
  {
    "question": "What is...",
    "answer": "A concise answer...",
    "citedSource": 1
  }
]`;

    const responseText = await callLLM(prompt);

    try {
        const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return parsed.map((q: any) => ({
            question: q.question,
            answer: q.answer,
            citation: q.citedSource >= 1 && q.citedSource <= chunks.length
                ? {
                    fileName: chunks[q.citedSource - 1].fileName,
                    pageNumber: chunks[q.citedSource - 1].pageNumber,
                    chunkIndex: chunks[q.citedSource - 1].chunkIndex,
                }
                : { fileName: "Unknown", pageNumber: 0, chunkIndex: 0 },
        }));
    } catch {
        return [];
    }
}

/**
 * Generate a concise cheatsheet from context chunks
 */
export async function generateCheatsheet(
    chunks: ChunkWithMeta[],
    subjectName: string
): Promise<string> {
    const contextStr = chunks
        .map(
            (c, i) =>
                `[Source ${i + 1}: ${c.fileName}, Page ${c.pageNumber}]\n${c.content}`
        )
        .join("\n\n---\n\n");

    const prompt = `You are a study assistant. Create a highly concise, organized Markdown cheatsheet summarizing the following study material for "${subjectName}".

SOURCE MATERIAL:
${contextStr}

INSTRUCTIONS:
- Use Markdown formatting (headings, bullet points, bold text).
- Focus only on key terms, definitions, formulas, and critical concepts.
- Omit fluff. Keep it extremely scannable for an exam review.
- Do NOT output json. Output pure Markdown.`;

    const responseText = await callLLM(prompt);
    return responseText.trim();
}
