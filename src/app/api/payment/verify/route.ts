import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tier) {
            return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET || "";

        // Verify signature
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        await dbConnect();

        // Payment is valid, update user's tier
        await User.findByIdAndUpdate(session.user.id, {
            tier: tier,
            razorpaySubscriptionId: razorpay_order_id, // we use order id as a simple reference since we aren't using deep recurrences yet
            questionsAsked: 0, // Reset usage upon upgrade
            lastQuestionReset: new Date()
        });

        return NextResponse.json({ success: true, message: `Successfully upgraded to ${tier} tier`, tier });

    } catch (error: any) {
        console.error("[Verify Payment Error]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
