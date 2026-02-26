import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDoc extends Document {
    name: string;
    email: string;
    password: string;
    tier: 'free' | 'basic' | 'standard' | 'premium';
    questionsAsked: number;
    lastQuestionReset: Date;
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
        },
        tier: {
            type: String,
            enum: ['free', 'basic', 'standard', 'premium'],
            default: 'free',
        },
        questionsAsked: {
            type: Number,
            default: 0,
        },
        lastQuestionReset: {
            type: Date,
            default: Date.now,
        },
        razorpayCustomerId: {
            type: String,
        },
        razorpaySubscriptionId: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const User: Model<IUserDoc> =
    mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);

export default User;
