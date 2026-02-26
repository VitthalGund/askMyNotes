import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubjectDoc extends Document {
    name: string;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SubjectSchema = new Schema<ISubjectDoc>(
    {
        name: {
            type: String,
            required: [true, "Subject name is required"],
            trim: true,
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

// Enforce max 3 subjects per user (safety net — API route also checks)
SubjectSchema.pre("save", async function (next) {
    if (this.isNew) {
        const SubjectModel = mongoose.model("Subject");
        const count = await SubjectModel.countDocuments({
            userId: this.userId,
        });
        if (count >= 3) {
            return next(new Error("Maximum of 3 subjects allowed per user"));
        }
    }
    return next();
});

const Subject: Model<ISubjectDoc> =
    mongoose.models.Subject ||
    mongoose.model<ISubjectDoc>("Subject", SubjectSchema);

export default Subject;
