"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import Script from "next/script";
import { useRouter } from "next/navigation";

const packages = [
  {
    id: "basic",
    name: "Basic",
    credits: 5,
    price: 200,
    priceString: "₹200",
    features: ["5 AI Note generations", "Mermaid Charts", "Interactive MCQs", "PDF Export"],
    color: "blue",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 15,
    price: 500,
    priceString: "₹500",
    popular: true,
    features: ["15 AI Note generations", "Mermaid Charts", "Interactive MCQs", "PDF Export", "AI Tutor Chatbot"],
    color: "blue",
  },
  {
    id: "ultra",
    name: "Ultra",
    credits: 50,
    price: 1000,
    priceString: "₹1000",
    features: ["50 AI Note generations", "Mermaid Charts", "Interactive MCQs", "PDF Export", "AI Tutor Chatbot", "Priority Support"],
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
          toast.success("Payment successful! Credits added.");
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
        description: `Purchase ${pkg.name}`,
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
              toast.success("Payment successful! Credits added.");
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
        prefill: { name: "User" },
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-14 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800 mb-4">
              <Zap className="h-4 w-4" /> Simple, transparent pricing
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Buy More Credits</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Choose a package to continue generating high-quality AI Notes.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {packages.map((pkg, i) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 card-hover animate-fade-in-up stagger-${i + 1} ${
                  pkg.popular
                    ? "border-blue-500 dark:border-blue-500 shadow-xl shadow-blue-500/15 scale-105 bg-white dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
                    <Star className="h-3.5 w-3.5 fill-white" /> Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{pkg.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{pkg.credits} credits included</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{pkg.priceString}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">one-time</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-11 font-semibold ${pkg.popular ? "shadow-lg shadow-blue-500/25" : ""}`}
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(pkg)}
                  disabled={loading !== null}
                >
                  {loading === pkg.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-10">
            Secure payments powered by Razorpay · Credits never expire
          </p>
        </div>
      </div>
    </>
  );
}
