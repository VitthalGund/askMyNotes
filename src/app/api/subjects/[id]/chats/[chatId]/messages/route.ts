import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";

// Get all messages for a chat session
export async function GET(
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

        // Verify chat session belongs to user
        const chatSession = await ChatSession.findOne({ _id: chatId, userId });
        if (!chatSession) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        const messages = await ChatMessage.find({ chatSessionId: chatId })
            .sort({ createdAt: 1 })
            .select("role content citations confidence confidenceExplanation evidenceSnippets notFound createdAt");

        return NextResponse.json({ messages });
    } catch (error: unknown) {
        console.error("Get messages error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
