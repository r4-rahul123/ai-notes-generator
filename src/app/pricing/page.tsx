"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Zap, Star, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Script from "next/script";
import { useRouter } from "next/navigation";

const packages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 10,
    price: 49,
    priceString: "₹49",
    originalPrice: "₹50",
    perCredit: "₹4.9 / note",
    badge: null,
    popular: false,
    features: [
      "10 AI Note Generations",
      "Interactive Mermaid Flowcharts",
      "Exam Practice MCQs with Scoring",
      "Full Study PDF Downloads",
      "Text & PDF Input Support",
    ],
    color: "blue",
  },
  {
    id: "pro",
    name: "Pro Scholar Pack",
    credits: 30,
    price: 119,
    priceString: "₹119",
    originalPrice: "₹150",
    discount: "21% OFF",
    perCredit: "₹3.9 / note",
    badge: "Most Popular",
    popular: true,
    features: [
      "30 AI Note Generations",
      "Interactive Mermaid Flowcharts",
      "Exam Practice MCQs with Scoring",
      "High-Res Multi-page PDF Exports",
      "Grounded RAG AI Tutor Chatbot",
      "Priority Gemini 3.5 AI Engine",
    ],
    color: "blue",
  },
  {
    id: "ultra",
    name: "Master Mega Bulk",
    credits: 100,
    price: 299,
    priceString: "₹299",
    originalPrice: "₹500",
    discount: "40% MEGA DISCOUNT",
    perCredit: "₹2.99 / note",
    badge: "Best Value",
    popular: false,
    features: [
      "100 AI Note Generations",
      "Interactive Mermaid Flowcharts",
      "Exam Practice MCQs with Scoring",
      "High-Res Multi-page PDF Exports",
      "Grounded RAG AI Tutor Chatbot",
      "Unlimited Vector Search Embeddings",
      "Credits Never Expire (Lifetime)",
    ],
    color: "purple",
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (pkg: (typeof packages)[0]) => {
    setLoading(pkg.id);
    try {
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey || razorpayKey === "dummy" || razorpayKey === "rzp_test_...") {
        toast.info("Mock Payment: Simulating successful payment...");
        const mockRes = await fetch("/api/mock-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creditsToAdd: pkg.credits }),
        });
        if (mockRes.ok) {
          toast.success(`Payment successful! ${pkg.credits} credits added.`);
          router.push("/dashboard?success=true");
        } else {
          toast.error("Mock payment failed.");
        }
        setLoading(null);
        return;
      }

      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AI Notes Generator",
        description: `Purchase ${pkg.name} (${pkg.credits} credits)`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              toast.success(`Payment successful! ${pkg.credits} credits added.`);
              router.push("/dashboard?success=true");
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch {
            toast.error("An error occurred during verification");
          } finally {
            setLoading(null);
          }
        },
        prefill: { name: "Student" },
        theme: { color: "#2563eb" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description);
        setLoading(null);
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Welcome Bonus Callout */}
          <div className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center gap-3 text-center shadow-xs">
            <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-bounce" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              🎁 <span className="text-blue-600 dark:text-blue-400 font-bold">First Sign-Up Gift:</span> Every new user gets <span className="underline decoration-blue-500 font-extrabold text-blue-700 dark:text-blue-300">15 FREE Credits</span> automatically!
            </p>
          </div>

          {/* Header */}
          <div className="text-center mb-14 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800 mb-4">
              <Zap className="h-4 w-4" /> Base Rate: ₹5 / Credit · Huge Bulk Discounts
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-3">
              Buy Study Credits
            </h1>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              1 credit = 1 complete AI study package (Notes + Flowcharts + MCQs + RAG Chat). Credits never expire!
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto items-stretch">
            {packages.map((pkg, i) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border p-7 sm:p-8 transition-all duration-300 card-hover animate-fade-in-up stagger-${i + 1} ${
                  pkg.popular
                    ? "border-blue-500 dark:border-blue-500 shadow-xl shadow-blue-500/15 md:-translate-y-2 bg-white dark:bg-slate-800/95 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90"
                }`}
              >
                {/* Badges */}
                {pkg.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md whitespace-nowrap">
                    <Star className="h-3 w-3 fill-white" /> {pkg.badge}
                  </div>
                )}
                {pkg.discount && !pkg.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md whitespace-nowrap">
                    <Sparkles className="h-3 w-3 fill-white" /> {pkg.discount}
                  </div>
                )}

                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{pkg.name}</h2>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    ⚡ {pkg.credits} Credits included
                  </div>
                </div>

                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{pkg.priceString}</span>
                  {pkg.originalPrice && (
                    <span className="text-slate-400 dark:text-slate-500 text-base line-through font-medium">
                      {pkg.originalPrice}
                    </span>
                  )}
                  {pkg.discount && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {pkg.discount}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                  {pkg.perCredit} · One-time payment
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-11 font-semibold rounded-xl ${
                    pkg.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                      : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(pkg)}
                  disabled={loading !== null}
                >
                  {loading === pkg.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    `Buy ${pkg.credits} Credits`
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="text-center space-y-2 mt-12">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              🔒 Instant activation · Secure payments powered by Razorpay · Credits never expire
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
