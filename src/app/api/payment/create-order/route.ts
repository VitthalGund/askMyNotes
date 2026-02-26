import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Razorpay from "razorpay";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

const TIER_PRICES: Record<string, { monthly: number; yearly: number }> = {
    basic: { monthly: 99, yearly: 999 },
    standard: { monthly: 299, yearly: 2999 },
    premium: { monthly: 499, yearly: 4999 },
};

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { tier, cycle } = body; // tier: 'basic' | 'standard' | 'premium', cycle: 'monthly' | 'yearly'

        if (!tier || !TIER_PRICES[tier]) {
            return NextResponse.json({ error: "Invalid tier selection" }, { status: 400 });
        }

        if (cycle !== "monthly" && cycle !== "yearly") {
            return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
        }

        const priceINR = TIER_PRICES[tier][cycle];
        const amountInPaise = priceINR * 100; // Razorpay expects paise

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`,
            notes: {
                userId: session.user.id,
                tier: tier,
                cycle: cycle
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            tier,
            cycle
        });

    } catch (error: any) {
        console.error("[Create Order Error]", error);
        return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
    }
}
