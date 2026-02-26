import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import StarredQuestion from "@/models/StarredQuestion";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { questionId } = await params;

        // Verify it belongs to user
        const star = await StarredQuestion.findOne({ _id: questionId, userId });
        if (!star) {
            return NextResponse.json({ error: "Question not found or unauthorized" }, { status: 404 });
        }

        await StarredQuestion.deleteOne({ _id: questionId });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete starred error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
