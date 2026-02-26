import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDoc extends Document {
    name: string;
    email: string;
    password: string;
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
    },
    {
        timestamps: true,
    }
);

const User: Model<IUserDoc> =
    mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);

export default User;
