import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";

// Rename a chat session
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; chatId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { chatId } = await params;

        const { title } = await req.json();
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const chat = await ChatSession.findOneAndUpdate(
            { _id: chatId, userId },
            { title: title.trim() },
            { new: true }
        );

        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        return NextResponse.json({ chat });
    } catch (error: unknown) {
        console.error("Rename chat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Delete a chat session and all its messages
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; chatId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { chatId } = await params;

        const chat = await ChatSession.findOneAndDelete({ _id: chatId, userId });
        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        // Cascade delete all messages in this chat
        await ChatMessage.deleteMany({ chatSessionId: chatId });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete chat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
