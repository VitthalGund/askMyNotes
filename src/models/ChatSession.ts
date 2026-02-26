import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatSessionDoc extends Document {
    title: string;
    subjectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSessionDoc>(
    {
        title: {
            type: String,
            default: "New Chat",
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
    },
    {
        timestamps: true,
    }
);

// Index for listing chats by subject
ChatSessionSchema.index({ subjectId: 1, userId: 1, updatedAt: -1 });

const ChatSession: Model<IChatSessionDoc> =
    mongoose.models.ChatSession ||
    mongoose.model<IChatSessionDoc>("ChatSession", ChatSessionSchema);

export default ChatSession;
