import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import DocModel from "@/models/Document";
import ChatMessage from "@/models/ChatMessage";

export async function DELETE(
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

        const subject = await Subject.findOne({ _id: id, userId });
        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Cascade delete documents and chat messages
        await DocModel.deleteMany({ subjectId: id });
        await ChatMessage.deleteMany({ subjectId: id });
        await Subject.findByIdAndDelete(id);

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error: unknown) {
        console.error("Delete subject error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
