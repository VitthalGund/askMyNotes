import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const subjects = await Subject.find({ userId }).sort({ createdAt: -1 });

        return NextResponse.json({ subjects });
    } catch (error: unknown) {
        console.error("Get subjects error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;

        // Check existing count
        const count = await Subject.countDocuments({ userId });
        if (count >= 3) {
            return NextResponse.json(
                { error: "Maximum of 3 subjects allowed. Please delete one to add a new subject." },
                { status: 400 }
            );
        }

        const subject = await Subject.create({ name: name.trim(), userId });
        return NextResponse.json({ subject }, { status: 201 });
    } catch (error: unknown) {
        console.error("Create subject error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
