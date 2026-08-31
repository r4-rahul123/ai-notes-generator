import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Download,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const steps = [
    {
      step: "01",
      icon: <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      badge: "Step 1: Input",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      title: "Enter Topic or PDF",
      desc: "Type any subject or upload a PDF textbook. Choose your class level from school to higher education.",
      linkText: "Generate Notes",
      href: "/generate",
    },
    {
      step: "02",
      icon: <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      badge: "Step 2: Learn",
      badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      title: "Visual Charts & Summary",
      desc: "Get comprehensive notes, quick revision points, and interactive graphical flowcharts for easy understanding.",
      linkText: "View Sample",
      href: "/generate",
    },
    {
      step: "03",
      icon: <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      badge: "Step 3: Test & Export",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      title: "Practice MCQs & PDF",
      desc: "Attempt interactive quizzes with instant scores, view direct exam answers, and download formatted PDF study notes.",
      linkText: "Start Learning",
      href: "/generate",
    },
  ];

  const highlights = [
    { icon: <FileText className="h-4 w-4 text-blue-500" />, label: "Structured Study Notes" },
    { icon: <Sparkles className="h-4 w-4 text-purple-500" />, label: "Visual Concept Flowcharts" },
    { icon: <MessageSquare className="h-4 w-4 text-indigo-500" />, label: "RAG AI Tutor Chat" },
    { icon: <Download className="h-4 w-4 text-emerald-500" />, label: "Instant PDF Download" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12 sm:py-16 relative">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-blue-200 dark:border-blue-800/80 shadow-xs">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            AI-Powered Study & Revision Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Supercharge your study with{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Notes
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Convert any topic or PDF into structured study notes, visual flowcharts, exam question answers, and interactive quizzes in seconds.
          </p>

          {/* Call To Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/generate" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all font-semibold"
              >
                Generate Notes Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                View My Notes
              </Button>
            </Link>
          </div>

          {/* Quick Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 text-slate-600 dark:text-slate-400"
              >
                {h.icon}
                <span>{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works / 3 Interactive Guide Cards */}
        <div className="space-y-6 pt-12">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              How AI Notes Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Three simple steps to master any subject
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {steps.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative bg-white dark:bg-white/[0.04] backdrop-blur-xl p-6 pb-8 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon + Step Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>{item.linkText}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
