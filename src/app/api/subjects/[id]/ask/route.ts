import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import { retrieveRelevantChunks } from "@/lib/rag";
import { generateAnswer } from "@/lib/gemini";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { question, chatSessionId } = await req.json();

        if (!question || !question.trim()) {
            return NextResponse.json({ error: "Question is required" }, { status: 400 });
        }

        if (!chatSessionId) {
            return NextResponse.json({ error: "Chat session ID is required" }, { status: 400 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        // Verify subject belongs to user
        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Verify chat session belongs to user and subject
        const chatSession = await ChatSession.findOne({ _id: chatSessionId, subjectId: id, userId });
        if (!chatSession) {
            return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
        }

        const user = await User.findById(userId);
        const tier = user?.tier || 'free';

        const tierLimits: Record<string, number> = {
            free: 10,
            basic: 100,
            standard: Infinity,
            premium: Infinity
        };
        const maxLimit = tierLimits[tier] || 10;

        // Reset usage if it's a new month
        const now = new Date();
        const lastReset = user?.lastQuestionReset || new Date(0);
        let questionsAsked = user?.questionsAsked || 0;

        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            questionsAsked = 0;
            if (user) {
                user.questionsAsked = 0;
                user.lastQuestionReset = now;
                await user.save();
            }
        }

        if (questionsAsked >= maxLimit) {
            return NextResponse.json(
                {
                    error: `Maximum matching ${maxLimit} questions allowed per month for the ${tier} tier. Upgrade to keep asking.`,
                    reason: 'limit_exceeded',
                    feature: 'question'
                },
                { status: 403 }
            );
        }

        // Save user message
        await ChatMessage.create({
            subjectId: id,
            userId,
            chatSessionId,
            role: "user",
            content: question.trim(),
            citations: [],
            confidence: "",
            evidenceSnippets: [],
        });

        // Get conversation history for multi-turn (last 10 messages in this chat)
        const history = await ChatMessage.find({ chatSessionId })
            .sort({ createdAt: -1 })
            .limit(10);

        const conversationHistory = history
            .reverse()
            .map((m) => ({ role: m.role, content: m.content }));

        // Retrieve relevant chunks from subject documents
        const chunks = await retrieveRelevantChunks(id, question.trim(), 10);

        // Generate answer
        const result = await generateAnswer(
            question.trim(),
            chunks,
            subject.name,
            conversationHistory
        );

        // Save assistant message
        await ChatMessage.create({
            subjectId: id,
            userId,
            chatSessionId,
            role: "assistant",
            content: result.answer,
            citations: result.citations,
            confidence: result.confidence,
            evidenceSnippets: result.evidenceSnippets,
        });

        // Update chat session timestamp so it sorts to top
        await ChatSession.findByIdAndUpdate(chatSessionId, { updatedAt: new Date() });

        // Auto-title: if chat is still "New Chat" and this is the first question, set title
        if (chatSession.title === "New Chat") {
            const shortTitle = question.trim().slice(0, 50) + (question.trim().length > 50 ? "..." : "");
            await ChatSession.findByIdAndUpdate(chatSessionId, { title: shortTitle });
        }

        if (user) {
            user.questionsAsked += 1;
            await user.save();
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Ask error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
