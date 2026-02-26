"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureBlocked: "subject" | "question";
}

const TIER_FEATURES = {
  free: { name: "Free", price: "₹0", subjects: "1 Subject", qs: "10 Questions/mo" },
  basic: { name: "Basic", price: "₹99/mo", subjects: "3 Subjects", qs: "100 Questions/mo" },
  standard: { name: "Standard", price: "₹299/mo", subjects: "5 Subjects", qs: "Unlimited Questions" },
  premium: { name: "Premium", price: "₹499/mo", subjects: "10 Subjects", qs: "Unlimited Everything" }
};

export default function UpgradeModal({ isOpen, onClose, featureBlocked }: UpgradeModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  useEffect(() => {
    // Load Razorpay script when modal opens
    if (isOpen) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async (tier: string) => {
    try {
      setLoadingTier(tier);
      // 1. Create order
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle: "monthly" }) // simplify to monthly for now
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // 2. Checkout Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: data.amount,
        currency: data.currency,
        name: "AskMyNotes Premium",
        description: `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`,
        order_id: data.id,
        handler: async function (response: any) {
           // 3. Verify Payment Signature
           const verifyRes = await fetch("/api/payment/verify", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tier: tier
             })
           });
           const verifyData = await verifyRes.json();
           if (verifyData.success) {
               alert("Upgrade Successful! You can now continue studying.");
               router.refresh();
               onClose();
           } else {
               alert("Payment verification failed.");
           }
        },
        prefill: {
          name: session?.user?.name || "Student",
          email: session?.user?.email || "",
        },
        theme: {
          color: "#7c3aed"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      alert(err.message || "Failed to initiate payment");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 99999,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div className="glass-card animate-fade-in" style={{
        maxWidth: 900, width: "100%", padding: 40, position: "relative",
        background: "linear-gradient(180deg, rgba(30, 30, 50, 0.9) 0%, rgba(20, 20, 40, 0.95) 100%)",
        border: "1px solid rgba(124, 58, 237, 0.4)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 20, right: 20, background: "none", border: "none",
          color: "rgba(255,255,255,0.5)", fontSize: 24, cursor: "pointer"
        }}>×</button>

        <div style={{textAlign: "center", marginBottom: 40}}>
          <h2 style={{fontSize: 32, fontWeight: 800, marginBottom: 12}}>
            {featureBlocked === "subject" ? "Subject Limit Reached" : "Question Limit Reached"}
          </h2>
          <p className="text-muted-plus" style={{fontSize: 16}}>
            Unlock your full academic potential. Upgrade your tier to keep using AskMyNotes.
          </p>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20}}>
           {["basic", "standard", "premium"].map((t) => {
             const plan = TIER_FEATURES[t as keyof typeof TIER_FEATURES];
             return (
               <div key={t} style={{
                 padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.03)", 
                 border: `1px solid ${t === 'premium' ? 'var(--accent-1)' : 'rgba(255,255,255,0.1)'}`,
                 display: "flex", flexDirection: "column"
               }}>
                  <h3 style={{fontSize: 20, fontWeight: 700, marginBottom: 8, color: t === 'premium' ? 'var(--accent-3)' : '#fff'}}>{plan.name}</h3>
                  <div style={{fontSize: 28, fontWeight: 800, marginBottom: 20}}>{plan.price}</div>
                  
                  <ul style={{listStyle: "none", padding: 0, margin: 0, flex: 1, fontSize: 14, color: "var(--text-secondary)", lineHeight: 2}}>
                    <li>✅ {plan.subjects}</li>
                    <li>✅ {plan.qs}</li>
                    <li>✅ {t === 'premium' ? "Multilingual AI" : "AI Context Engine"}</li>
                    <li>✅ {t === 'premium' ? "Learning Analytics" : "Basic Flashcards"}</li>
                  </ul>

                  <button 
                    onClick={() => handleUpgrade(t)}
                    disabled={loadingTier !== null}
                    className="btn-gradient" 
                    style={{marginTop: 24, width: "100%", justifyContent: "center", ...(t !== 'premium' ? {background: 'rgba(255,255,255,0.1)', color: '#fff'} : {})}}
                  >
                    {loadingTier === t ? "Loading..." : "Upgrade"}
                  </button>
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
}
