import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Subject from "@/models/Subject";
import User from "@/models/User";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as { id: string }).id;
        const subjects = await Subject.find({ userId }).sort({ createdAt: -1 });

        const user = await User.findById(userId);
        const tier = user?.tier || 'free';
        const tierLimits: Record<string, number> = {
            free: 1, basic: 3, standard: 5, premium: 10
        };
        const maxLimit = tierLimits[tier] || 1;

        return NextResponse.json({ subjects, tier, limit: maxLimit });
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

        const user = await User.findById(userId);
        const tier = user?.tier || 'free';

        const tierLimits: Record<string, number> = {
            free: 1,
            basic: 3,
            standard: 5,
            premium: 10
        };
        const maxLimit = tierLimits[tier] || 1;

        // Check existing count
        const count = await Subject.countDocuments({ userId });
        if (count >= 3) {
            return NextResponse.json(
                {
                    error: `Maximum matching ${maxLimit} subjects allowed for the ${tier} tier. Upgrade to add more.`,
                    reason: 'limit_exceeded',
                    feature: 'subject'
                },
                { status: 403 }
            );
        }

        const subject = await Subject.create({ name: name.trim(), userId });
        return NextResponse.json({ subject }, { status: 201 });
    } catch (error: unknown) {
        console.error("Create subject error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
