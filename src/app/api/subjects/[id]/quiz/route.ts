import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import { retrieveAllChunks } from "@/lib/rag";
import { generateQuiz } from "@/lib/gemini";

export async function POST(
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

        // Get all chunks for the subject
        const allChunks = await retrieveAllChunks(id);

        if (allChunks.length === 0) {
            return NextResponse.json(
                { error: "No documents uploaded for this subject. Please upload notes first." },
                { status: 400 }
            );
        }

        // Parse difficulty from request body
        let difficulty = "medium";
        try {
            const body = await _req.json();
            if (body && body.difficulty) {
                difficulty = body.difficulty;
            }
        } catch {
            // Ignore if no body or invalid json
        }

        // Limit chunks to avoid token limits (take first 30 chunks or ~15000 words)
        const limitedChunks = allChunks.slice(0, 30);

        // Generate quiz
        const quiz = await generateQuiz(limitedChunks, subject.name, difficulty);

        return NextResponse.json(quiz);
    } catch (error: unknown) {
        console.error("Quiz generation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
