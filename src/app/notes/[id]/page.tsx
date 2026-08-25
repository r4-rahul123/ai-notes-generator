import connectToDatabase from "@/lib/mongoose";
import Note from "@/lib/models/Note";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { prepareMarkdown } from "@/lib/prepareMarkdown";
import MermaidRenderer from "@/components/MermaidRenderer";
import MCQSection from "@/components/MCQSection";
import PDFExportButton from "@/components/PDFExportButton";
import ShareNoteButton from "@/components/ShareNoteButton";
import NoteChat from "@/components/NoteChat";
import CodeBlock from "@/components/CodeBlock";
import ImportantQuestionsSection from "@/components/ImportantQuestionsSection";
import AutoPrinter from "@/components/AutoPrinter";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  HelpCircle,
  ListFilter,
  Lightbulb,
  Bookmark,
  Trophy,
  Award,
  ChevronRight,
  RotateCcw,
} from "lucide-react";


// Custom markdown components for rich, visually attractive note formatting with spacious layout
const customMarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-8 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4 flex items-center gap-2.5">
      <span className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full inline-block" />
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base mb-5">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-2.5 my-4 pl-6 list-disc marker:text-blue-500 dark:marker:text-blue-400">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="space-y-2.5 my-4 pl-6 list-decimal marker:text-blue-600 dark:marker:text-blue-400 marker:font-bold">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-slate-700 dark:text-slate-200 leading-relaxed text-base pl-1">
      {children}
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-slate-950 dark:text-white">
      {children}
    </strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-6 p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border-l-4 border-blue-500 rounded-r-xl italic text-slate-800 dark:text-slate-200 shadow-xs">
      {children}
    </blockquote>
  ),
  pre: ({ children }: any) => <>{children}</>,
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const isCodeBlock = !inline && match;
    const isMermaid = isCodeBlock && match[1] === "mermaid";

    if (isMermaid) {
      return <div className="my-6 rounded-xl overflow-hidden shadow-2xs border border-slate-200 dark:border-slate-700 page-break-inside-avoid"><MermaidRenderer chart={String(children).replace(/\n$/, "")} /></div>;
    }
    
    if (isCodeBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-mono text-xs sm:text-sm border border-slate-200 dark:border-slate-600 box-decoration-clone"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }: any) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
      <table className="w-full text-left text-sm divide-y divide-slate-200 dark:divide-slate-700">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="bg-slate-100 dark:bg-slate-800 px-4 py-3 font-semibold text-slate-900 dark:text-white">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/50">
      {children}
    </td>
  ),
};

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;
  await connectToDatabase();
  const noteDoc = await Note.findById(id).lean();

  if (!noteDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">Note not found.</p>
          <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 mt-2 inline-block hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const note = JSON.parse(JSON.stringify(noteDoc));
  const attempts = note.quizAttempts || [];
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const bestScore = attempts.reduce((max: number, a: any) => Math.max(max, a.score), 0);
  const totalQuestions = attempts[0]?.total || note.mcqs?.length || 5;

  return (
    <>
      <AutoPrinter />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6">
        <div className="container max-w-4xl mx-auto">

          {/* Back button */}
          <Link href="/dashboard" className="no-print inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
          </Link>

          {/* Header Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 sm:p-8 mb-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-fade-in-up backdrop-blur-xs">
            <div className="space-y-3">
              <div className="flex gap-2.5 flex-wrap items-center">
                <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-2xs">
                  <Bookmark className="h-3 w-3" /> {note.topic}
                </span>
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                  Level: {note.classLevel}
                </span>
                <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-indigo-500" /> Vector Indexed (RAG)
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {note.title}
              </h1>
            </div>
            <div className="no-print flex-shrink-0 flex items-center gap-2.5 flex-wrap">
              <ShareNoteButton
                noteId={note._id.toString()}
                noteTitle={note.title}
                topic={note.topic}
              />
              <PDFExportButton
                noteId={note._id.toString()}
                filename={note.topic}
                noteTitle={note.title}
                topic={note.topic}
                classLevel={note.classLevel}
                createdAt={note.createdAt ? new Date(note.createdAt).toLocaleDateString() : undefined}
              />
            </div>
          </div>

          {/* 🌟 Top MCQ Score & Performance Card Box */}
          <div className="no-print bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/80 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/40 rounded-2xl p-5 sm:p-6 mb-8 border border-indigo-200/80 dark:border-slate-700 shadow-sm animate-fade-in flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Trophy className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    MCQ Quiz Scorecard
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {attempts.length} / 5 Attempts Used
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {latestAttempt
                    ? `Latest: ${latestAttempt.score}/${latestAttempt.total} (${Math.round((latestAttempt.score / latestAttempt.total) * 100)}%) · Best: ${bestScore}/${totalQuestions}`
                    : "No quiz attempts yet. Test your knowledge with 5-6 tailored MCQs!"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <a
                href="#mcq-section"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all hover:gap-2"
              >
                {latestAttempt ? (
                  <>
                    <Award className="h-4 w-4" /> View / Retake Quiz
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Take Quiz Now
                  </>
                )}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Main Content Document */}
          <div id="note-content" className="space-y-12 bg-white dark:bg-slate-800/90 p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 animate-scale-in">

            {/* Summary Section */}
            <section className="bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-purple-50/40 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/20 p-6 sm:p-7 rounded-2xl border border-blue-100 dark:border-blue-900/40">
              <h2 className="text-xl font-bold mb-3.5 text-blue-950 dark:text-blue-200 flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                Executive Summary
              </h2>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-base sm:text-lg space-y-3">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                >
                  {prepareMarkdown(note.summary)}
                </ReactMarkdown>
              </div>
            </section>

            <Separator className="dark:bg-slate-700" />

            {/* Detailed Notes Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Detailed Notes & Concepts
                </h2>
              </div>
              
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                  components={customMarkdownComponents}
                >
                  {prepareMarkdown(note.content)}
                </ReactMarkdown>
              </div>
            </section>

            {/* Visuals & Charts */}
            {note.mermaidCharts && note.mermaidCharts.length > 0 && (
              <>
                <Separator className="dark:bg-slate-700" />
                <section className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <ListFilter className="h-4 w-4" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Visual Concepts & Flowcharts
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {note.mermaidCharts.map((chart: string, idx: number) => (
                      <div key={idx} className="rounded-xl overflow-hidden shadow-2xs">
                        <MermaidRenderer chart={chart} />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator className="dark:bg-slate-700" />

            {/* Quick Revision Notes */}
            <section className="bg-amber-50/50 dark:bg-amber-950/20 p-6 sm:p-7 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-bold text-amber-950 dark:text-amber-200">
                  Quick Revision & Key Points
                </h2>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                  components={customMarkdownComponents}
                >
                  {prepareMarkdown(note.shortNotes)}
                </ReactMarkdown>
              </div>
            </section>

            <Separator className="dark:bg-slate-700" />

            {/* Important Questions & Interactive Answers */}
            <div className="no-print">
              <ImportantQuestionsSection
                questions={note.importantQuestions || []}
                topic={note.topic}
                classLevel={note.classLevel}
              />
            </div>

            {/* Print-Only Important Questions */}
            {(note.importantQuestions && note.importantQuestions.length > 0) && (
              <div id="pdf-questions" className="hidden print:block mt-8 mb-8 break-before-page">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                  Important Exam Questions & Answers
                </h2>
                <div className="space-y-6">
                  {note.importantQuestions.map((item: any, idx: number) => {
                    const isObject = typeof item === "object" && item !== null;
                    const qText = isObject ? item.question : String(item);
                    const aText = isObject ? item.answer : "Answer not generated yet.";
                    
                    return (
                      <div key={idx} className="page-break-inside-avoid mb-6">
                        <div className="font-bold text-slate-900 mb-2 flex items-start gap-2">
                          <span className="shrink-0">Q{idx + 1}.</span> 
                          <div className="prose prose-slate max-w-none text-slate-900 font-bold">
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]} components={customMarkdownComponents}>{prepareMarkdown(qText)}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm ml-8">
                          <div className="font-bold mb-1 text-slate-900 page-break-after-avoid">Ans:</div>
                          <div className="prose prose-slate max-w-none text-slate-800 text-sm">
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]} components={customMarkdownComponents}>{prepareMarkdown(aText || "Answer not available.")}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Interactive MCQ Practice Section with History & Retry */}
          <div className="no-print mt-12 bg-white dark:bg-slate-800/90 p-6 sm:p-10 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm animate-fade-in-up">
            <MCQSection
              noteId={note._id.toString()}
              initialMcqs={note.mcqs || []}
              initialAttempts={note.quizAttempts || []}
            />
          </div>

          {/* Print-Only MCQs Q&A */}
          {(note.mcqs && note.mcqs.length > 0) && (
            <div id="pdf-mcqs" className="hidden print:block mt-8 mb-8 break-before-page">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                Practice MCQs & Solutions
              </h2>
              <div className="space-y-6">
                {note.mcqs.map((mcq: any, idx: number) => (
                  <div key={idx} className="page-break-inside-avoid mb-6">
                    <div className="font-bold text-slate-900 mb-2 flex items-start gap-2">
                      <span>{idx + 1}.</span> 
                      <div className="prose prose-slate max-w-none text-slate-900 font-bold">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]} components={customMarkdownComponents}>{prepareMarkdown(mcq.question)}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-900 text-sm ml-6">
                      <div className="font-bold mb-1 page-break-after-avoid">Answer:</div>
                      <div className="prose prose-slate max-w-none text-green-900 text-sm">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]} components={customMarkdownComponents}>{prepareMarkdown(mcq.correctAnswer)}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating AI Chat */}
      <NoteChat
        noteId={note._id.toString()}
        noteContext={{
          title: note.title,
          topic: note.topic,
          classLevel: note.classLevel,
          summary: note.summary,
          content: note.content,
          shortNotes: note.shortNotes,
          importantQuestions: note.importantQuestions,
        }}
      />
    </>
  );
}
