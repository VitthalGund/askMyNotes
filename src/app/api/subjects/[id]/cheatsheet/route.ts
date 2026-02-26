import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import User from "@/models/User";
import { retrieveAllChunks } from "@/lib/rag";
import { generateCheatsheet } from "@/lib/gemini";

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

        const user = await User.findById(userId);
        if (user?.tier === 'free') {
            return NextResponse.json(
                {
                    error: "Study Mode is not available on the Free tier. Upgrade to unlock.",
                    reason: 'limit_exceeded',
                    feature: 'question'
                },
                { status: 403 }
            );
        }

        // Get all chunks for the subject
        const allChunks = await retrieveAllChunks(id);

        if (allChunks.length === 0) {
            return NextResponse.json(
                { error: "No documents uploaded for this subject. Please upload notes first." },
                { status: 400 }
            );
        }

        // Limit chunks (cheatsheets should ideally look at as much as possible, but we cap to 50 here)
        const limitedChunks = allChunks.slice(0, 50);

        // Generate cheatsheet
        const cheatsheetMarkdown = await generateCheatsheet(limitedChunks, subject.name);

        return NextResponse.json({ cheatsheet: cheatsheetMarkdown });
    } catch (error: unknown) {
        console.error("Cheatsheet generation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
