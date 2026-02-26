import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import ChatSession from "@/models/ChatSession";

// List all chat sessions for a subject
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        // Verify subject belongs to user
        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        const chats = await ChatSession.find({ subjectId: id, userId })
            .sort({ updatedAt: -1 })
            .select("title createdAt updatedAt");

        return NextResponse.json({ chats });
    } catch (error: unknown) {
        console.error("List chats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Create a new chat session
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        // Verify subject belongs to user
        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const title = body.title?.trim() || "New Chat";

        const chat = await ChatSession.create({
            title,
            subjectId: id,
            userId,
        });

        return NextResponse.json({ chat }, { status: 201 });
    } catch (error: unknown) {
        console.error("Create chat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
