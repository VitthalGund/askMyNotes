export interface IUser {
    _id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

export interface ISubject {
    _id: string;
    name: string;
    userId: string;
    createdAt: Date;
}

export interface IChunk {
    content: string;
    pageNumber: number;
    chunkIndex: number;
}

export interface IDocument {
    _id: string;
    fileName: string;
    subjectId: string;
    userId: string;
    chunks: IChunk[];
    createdAt: Date;
}

export interface ICitation {
    fileName: string;
    pageNumber: number;
    chunkIndex: number;
}

export interface IChatMessage {
    _id: string;
    subjectId: string;
    userId: string;
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    citations: ICitation[];
    confidence: "High" | "Medium" | "Low" | "";
    evidenceSnippets: string[];
    createdAt: Date;
}

export interface MCQQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citation: ICitation;
}

export interface ShortAnswerQuestion {
    question: string;
    modelAnswer: string;
    citation: ICitation;
}

export interface QuizData {
    mcqs: MCQQuestion[];
    shortAnswer: ShortAnswerQuestion[];
}

export interface AskResponse {
    answer: string;
    citations: ICitation[];
    confidence: "High" | "Medium" | "Low";
    evidenceSnippets: string[];
    notFound: boolean;
}
