import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";
import Document from "@/models/Document";

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
        const { id, chatId } = await params;

        // Verify chat session belongs to user
        const chatSession = await ChatSession.findOne({ _id: chatId, userId });
        if (!chatSession) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        const rawMessages = await ChatMessage.find({ chatSessionId: chatId })
            .sort({ createdAt: 1 })
            .select("role content citations confidence confidenceExplanation evidenceSnippets notFound createdAt")
            .lean();

        // Dynamically resurrect missing file URLs from historic chats generated before the Schema patch
        const documents = await Document.find({ subjectId: id }).select("fileName fileUrl").lean();
        const urlMap: Record<string, string> = {};
        documents.forEach((doc) => {
            if (doc.fileUrl) urlMap[doc.fileName] = doc.fileUrl;
        });

        const messages = rawMessages.map((msg) => {
            if (msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0) {
                msg.citations = msg.citations.map((c: { fileName: string; fileUrl?: string; pageNumber: number; chunkIndex: number }) => ({
                    ...c,
                    fileUrl: c.fileUrl || urlMap[c.fileName] || undefined
                }));
            }
            return msg;
        });

        return NextResponse.json({ messages });
    } catch (error: unknown) {
        console.error("Get messages error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
