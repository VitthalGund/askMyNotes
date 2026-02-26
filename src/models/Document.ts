import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChunkDoc {
    content: string;
    pageNumber: number;
    chunkIndex: number;
    embedding: number[];
}

export interface IDocumentDoc extends Document {
    fileName: string;
    subjectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    fileUrl?: string;
    chunks: IChunkDoc[];
    createdAt: Date;
}

const ChunkSchema = new Schema<IChunkDoc>(
    {
        content: { type: String, required: true },
        pageNumber: { type: Number, required: true },
        chunkIndex: { type: Number, required: true },
        embedding: { type: [Number], default: [] },
    },
    { _id: false }
);

const DocumentSchema = new Schema<IDocumentDoc>(
    {
        fileName: {
            type: String,
            required: [true, "File name is required"],
            trim: true,
        },
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
        fileUrl: {
            type: String,
        },
        chunks: [ChunkSchema],
    },
    {
        timestamps: true,
    }
);

// Index for fast lookups
DocumentSchema.index({ subjectId: 1 });
DocumentSchema.index({ userId: 1 });

const DocModel: Model<IDocumentDoc> =
    mongoose.models.Document ||
    mongoose.model<IDocumentDoc>("Document", DocumentSchema);

export default DocModel;
