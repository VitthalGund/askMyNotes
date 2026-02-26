import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DocModel from "@/models/Document";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; docId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const { docId } = await params;

        const doc = await DocModel.findOne({ _id: docId, userId });
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        await DocModel.findByIdAndDelete(docId);
        return NextResponse.json({ message: "Document deleted successfully" });
    } catch (error: unknown) {
        console.error("Delete document error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
