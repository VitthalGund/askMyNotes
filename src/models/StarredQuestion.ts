import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStarredQuestion extends Document {
    userId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    type: "mcq" | "short_answer";
    question: string;
    options?: string[]; // Only for mcq
    correctIndex?: number; // Only for mcq
    explanation?: string; // Only for mcq
    modelAnswer?: string; // Only for short_answer
    citation: {
        fileName: string;
        pageNumber: number;
        chunkIndex: number;
    };
    createdAt: Date;
}

const StarredQuestionSchema = new Schema<IStarredQuestion>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
        type: { type: String, enum: ["mcq", "short_answer"], required: true },
        question: { type: String, required: true },
        options: { type: [String], required: false },
        correctIndex: { type: Number, required: false },
        explanation: { type: String, required: false },
        modelAnswer: { type: String, required: false },
        citation: {
            fileName: { type: String, required: true },
            pageNumber: { type: Number, required: true },
            chunkIndex: { type: Number, required: true },
        },
    },
    { timestamps: true }
);

// Indexes to quickly find starred questions by user and subject
StarredQuestionSchema.index({ userId: 1, subjectId: 1 });

const StarredQuestion: Model<IStarredQuestion> =
    mongoose.models.StarredQuestion ||
    mongoose.model<IStarredQuestion>("StarredQuestion", StarredQuestionSchema);

export default StarredQuestion;
