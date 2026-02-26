import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICitationDoc {
    fileName: string;
    pageNumber: number;
    chunkIndex: number;
    fileUrl?: string;
}

export interface IChatMessageDoc extends Document {
    subjectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    sessionId: string;
    chatSessionId?: mongoose.Types.ObjectId;
    role: "user" | "assistant";
    content: string;
    citations: ICitationDoc[];
    confidence: "High" | "Medium" | "Low" | "";
    evidenceSnippets: string[];
    createdAt: Date;
}

const CitationSchema = new Schema<ICitationDoc>(
    {
        fileName: { type: String, required: true },
        pageNumber: { type: Number, required: true },
        chunkIndex: { type: Number, required: true },
    },
    { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessageDoc>(
    {
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sessionId: {
            type: String,
            required: false,
        },
        chatSessionId: {
            type: Schema.Types.ObjectId,
            ref: "ChatSession",
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        citations: [CitationSchema],
        confidence: {
            type: String,
            enum: ["High", "Medium", "Low", ""],
            default: "",
        },
        evidenceSnippets: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

// Index for fetching conversation history
ChatMessageSchema.index({ subjectId: 1, sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessageDoc> =
    mongoose.models.ChatMessage ||
    mongoose.model<IChatMessageDoc>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
