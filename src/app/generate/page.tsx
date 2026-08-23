"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  BookOpen,
  GraduationCap,
  FileText,
  Upload,
  X,
  CheckCircle,
  FileUp,
  Brain,
  Database,
  Award,
} from "lucide-react";

type Mode = "topic" | "pdf";

const loadingSteps = [
  { threshold: 15, label: "Analyzing topic & semantic structure...", icon: Brain },
  { threshold: 40, label: "Synthesizing comprehensive notes & flashcards...", icon: BookOpen },
  { threshold: 65, label: "Generating interactive Mermaid flowcharts & diagrams...", icon: Sparkles },
  { threshold: 85, label: "Formulating examination MCQs with scoring...", icon: Award },
  { threshold: 95, label: "Indexing document chunks into Vector Database (RAG)...", icon: Database },
  { threshold: 100, label: "Notes generated! Finalizing (100%)...", icon: CheckCircle },
];

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState("Initializing AI engine...");
  const [mode, setMode] = useState<Mode>("topic");

  // Topic mode
  const [topic, setTopic] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // PDF mode
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number>(0);
  const [pdfTopic, setPdfTopic] = useState("");
  const [pdfLevel, setPdfLevel] = useState("");
  const [pdfInstructions, setPdfInstructions] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const suggestions = [
    "Photosynthesis",
    "World War 2",
    "Thermodynamics",
    "Newton's Laws",
    "RSA Cryptography",
    "Machine Learning Basics",
  ];

  // Animated progress timer during generation
  useEffect(() => {
    if (loading) {
      setProgress(5);
      setCurrentStepText("Analyzing topic & semantic structure...");

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) {
            return 92; // hold at 92% until response resolves
          }
          const step = Math.min(prev + (prev < 40 ? 4 : prev < 75 ? 3 : 1), 92);

          // Update step label based on current progress
          const currentStep = loadingSteps.find((s) => step <= s.threshold) || loadingSteps[0];
          setCurrentStepText(currentStep.label);

          return step;
        });
      }, 450);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [loading]);

  // Fast Client-Side PDF Text Extractor (Runs directly in the browser with 0ms network latency)
  const extractPdfTextInBrowser = async (file: File): Promise<{ text: string; pages: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const rawString = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer));
    
    // Count pages
    const pageMatches = rawString.match(/\/Type\s*\/Page\b/g);
    const pages = pageMatches ? pageMatches.length : 1;
    
    let text = "";
    const btMatches = rawString.match(/BT[\s\S]*?ET/g);
    if (btMatches) {
      for (const bt of btMatches) {
        const textSegments = bt.match(/\(([^()]*)\)/g);
        if (textSegments) {
          const line = textSegments
            .map((s) => s.slice(1, -1))
            .join(" ")
            .trim();
          if (line) text += line + "\n";
        }
        const tjMatches = bt.match(/\[(.*?)\]\s*TJ/g);
        if (tjMatches) {
          for (const tj of tjMatches) {
            const innerTexts = tj.match(/\(([^()]*)\)/g);
            if (innerTexts) {
              const line = innerTexts.map((s) => s.slice(1, -1)).join("");
              if (line) text += line + " ";
            }
          }
          text += "\n";
        }
      }
    }

    if (text.trim().length < 40) {
      const genericMatches = rawString.match(/\(([^()]{4,})\)/g);
      if (genericMatches) {
        text = genericMatches
          .map((s) => s.slice(1, -1))
          .filter((s) => /[a-zA-Z0-9]/.test(s))
          .join(" ");
      }
    }

    return { text: text.trim(), pages: Math.max(1, pages) };
  };

  // Handle PDF file selection & parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Only PDF files are supported!");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large! Max 15MB allowed.");
      return;
    }

    setPdfFile(file);
    setPdfText(null);
    setPdfParsing(true);

    try {
      let extractedText = "";
      let pages = 1;

      // 1. Try instant client-side browser extraction first (0ms latency, zero server errors)
      try {
        const clientResult = await extractPdfTextInBrowser(file);
        if (clientResult.text && clientResult.text.length > 50) {
          extractedText = clientResult.text;
          pages = clientResult.pages;
        }
      } catch (cErr) {
        console.warn("Client extraction skipped:", cErr);
      }

      // 2. Fallback to server-side parser if browser stream was compressed
      if (!extractedText || extractedText.length < 50) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const rawText = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Could not extract text from this PDF. Please ensure it is a text-based PDF.");
        }

        if (!res.ok) {
          throw new Error(data?.error || "Failed to parse PDF");
        }

        extractedText = data.text;
        pages = data.pages || 1;
      }

      // Limit to ~14,000 chars for optimal AI note generation
      const truncated =
        extractedText.length > 14000
          ? extractedText.slice(0, 14000) + "\n\n[...Content summarized for optimal note generation]"
          : extractedText;

      setPdfText(truncated);
      setPdfPages(pages);

      if (!pdfTopic) {
        const name = file.name.replace(/\.pdf$/i, "").replace(/_|-/g, " ");
        setPdfTopic(name.slice(0, 60));
      }
      if (!pdfLevel) {
        setPdfLevel(classLevel || "College / Undergraduate");
      }
      toast.success(`PDF parsed! ${pages} pages extracted ✅`);
    } catch (err: any) {
      toast.error(err.message || "Failed to read PDF");
      setPdfFile(null);
    } finally {
      setPdfParsing(false);
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfText(null);
    setPdfPages(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic =
      (mode === "pdf" ? pdfTopic : topic) ||
      (pdfFile ? pdfFile.name.replace(".pdf", "").replace(/_|-/g, " ") : "");
    const finalLevel =
      (mode === "pdf" ? pdfLevel : classLevel) || "College / Undergraduate";
    const finalInstructions = mode === "pdf" ? pdfInstructions : additionalInstructions;

    if (!finalTopic) {
      toast.error("Please provide a topic or focus area.");
      return;
    }
    if (mode === "pdf" && !pdfText) {
      toast.error("Please upload and wait for PDF to finish reading.");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        topic: finalTopic,
        classLevel: finalLevel,
        additionalInstructions: finalInstructions,
      };
      if (mode === "pdf" && pdfText) {
        body.pdfContent = pdfText;
        body.pdfFileName = pdfFile?.name;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 504
            ? "Server timed out while processing large PDF. Please try focusing on a specific topic or shorter document."
            : "Server returned an unexpected format. Please try again."
        );
      }

      if (!res.ok) throw new Error(data?.error || "Failed to generate notes");

      // Smoothly advance to 100%
      setProgress(100);
      setCurrentStepText("Notes generated successfully! Loading notes (100%)...");
      toast.success("Notes generated successfully!");

      setTimeout(() => {
        router.push(`/notes/${data.noteId}`);
      }, 600);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate notes");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 dark:bg-blue-950 rounded-2xl mb-4 shadow-xs">
            <Sparkles className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Generate AI Notes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Choose a method to generate your structured notes & flashcards
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6 animate-scale-in border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => !loading && setMode("topic")}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "topic"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            By Topic
          </button>
          <button
            onClick={() => !loading && setMode("pdf")}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "pdf"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <FileUp className="h-4 w-4" />
            From PDF / Book
          </button>
        </div>

        {/* Form / Loading Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 sm:p-8 animate-scale-in">
          {loading ? (
            /* 🌟 Simple Minimal Progress Bar & Percentage */
            <div className="py-12 px-4 space-y-4 text-center animate-fade-in max-w-lg mx-auto">
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {progress}%
              </p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* ── TOPIC MODE ── */}
              {mode === "topic" && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="topic"
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <BookOpen className="h-4 w-4 text-blue-600" /> Topic *
                    </Label>
                    <Input
                      id="topic"
                      placeholder="e.g. Thermodynamics, RSA Cryptography, Photosynthesis"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={loading}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTopic(s)}
                          className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-600 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="classLevel"
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <GraduationCap className="h-4 w-4 text-blue-600" /> Class / Level *
                    </Label>
                    <Input
                      id="classLevel"
                      placeholder="e.g. 10th Grade, College Freshman, Masters"
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      disabled={loading}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-slate-700 dark:text-slate-200 font-medium">
                      Additional Instructions{" "}
                      <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="Focus on formulas, include Hindi explanations, add examples..."
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      disabled={loading}
                      rows={3}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>
                </>
              )}

              {/* ── PDF MODE ── */}
              {mode === "pdf" && (
                <>
                  {/* Upload Area */}
                  {!pdfFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group"
                    >
                      <Upload className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Click to upload PDF / Textbook
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Max 10MB · Auto-indexes into Vector Database
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border p-4 ${
                        pdfText
                          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                          : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {pdfParsing ? (
                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                          ) : pdfText ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          ) : (
                            <FileText className="h-8 w-8 text-slate-400" />
                          )}
                          <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                              {pdfFile.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {pdfParsing
                                ? "Extracting text & preparing chunks..."
                                : pdfText
                                ? `✅ ${pdfPages} pages extracted successfully`
                                : "Processing..."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removePdf}
                          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                      <BookOpen className="h-4 w-4 text-blue-600" /> Topic / Focus Area *
                    </Label>
                    <Input
                      placeholder="What topic should notes focus on from this PDF?"
                      value={pdfTopic}
                      onChange={(e) => setPdfTopic(e.target.value)}
                      disabled={loading}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                      <GraduationCap className="h-4 w-4 text-blue-600" /> Class / Level *
                    </Label>
                    <Input
                      placeholder="e.g. 12th Grade, B.Tech, MBA"
                      value={pdfLevel}
                      onChange={(e) => setPdfLevel(e.target.value)}
                      disabled={loading}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-200 font-medium">
                      Additional Instructions{" "}
                      <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      placeholder="Summarize Chapter 3, focus on formulas, ignore examples..."
                      value={pdfInstructions}
                      onChange={(e) => setPdfInstructions(e.target.value)}
                      disabled={loading}
                      rows={2}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>
                </>
              )}

              {/* Credit Notice */}
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                This will use <strong className="mx-1">1 credit</strong> from your account.
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                disabled={loading || (mode === "pdf" && pdfParsing)}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {mode === "pdf" ? "Generate Notes from PDF (with RAG)" : "Generate Notes"}
              </Button>
            </form>
          )}
        </div>

        {/* Info box for PDF mode */}
        {mode === "pdf" && !loading && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 animate-fade-in">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Vector Indexed RAG Enabled:
            </p>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400 text-xs">
              <li>• Text extracted & split into semantic vector chunks</li>
              <li>• Embeddings stored in Vector DB for high-precision AI chatbot queries</li>
              <li>• Works great with textbooks, lecture notes, and research papers</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
