import connectToDatabase from "@/lib/mongoose";
import Note from "@/lib/models/Note";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { prepareMarkdown } from "@/lib/prepareMarkdown";
import MermaidRenderer from "@/components/MermaidRenderer";
import MCQSection from "@/components/MCQSection";
import PDFExportButton from "@/components/PDFExportButton";
import CodeBlock from "@/components/CodeBlock";
import ImportantQuestionsSection from "@/components/ImportantQuestionsSection";
import ShareNoteButton from "@/components/ShareNoteButton";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  ListFilter,
  Lightbulb,
  Bookmark,
  Globe,
  ArrowRight,
} from "lucide-react";


// Markdown components for clean note reading
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
  code: ({ children, className, ...props }: any) => {
    const isCodeBlock =
      Boolean(className) ||
      (typeof children === "string" && children.includes("\n"));

    if (isCodeBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-mono text-xs sm:text-sm border border-slate-200 dark:border-slate-600"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }: any) => (
    <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
      <table className="w-full text-left text-sm divide-y divide-slate-200 dark:divide-slate-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
      {children}
    </tbody>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
      {children}
    </td>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
      {children}
    </tr>
  ),
};

export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectToDatabase();

  const note = await Note.findById(id).lean();
  if (!note) {
    notFound();
  }

  const rawQuestions = note.importantQuestions || [];
  const normalizedQuestions = rawQuestions.map((item: any) => {
    if (typeof item === "object" && item !== null) {
      return {
        question: item.question || item.q || String(item),
        answer: item.answer || item.a || "",
      };
    }
    return {
      question: String(item),
      answer: "",
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* 🌟 Public Shared Banner */}
      <div className="sticky top-0 z-30 bg-blue-600 dark:bg-blue-700 text-white py-2.5 px-4 shadow-md">
        <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Globe className="h-4 w-4 shrink-0 text-blue-200" />
            <span>You are viewing a shared study note on <strong>{note.topic || note.title}</strong></span>
          </div>
          <Link href="/generate">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-xs text-xs h-7 px-3 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Create Your Own Notes
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        {/* Header Title & Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200/80 dark:border-blue-800/60">
                {note.topic}
              </span>
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {note.classLevel}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Actions: Share & PDF */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
                createdAt={new Date(note.createdAt).toLocaleDateString()}
              />
            </div>
          </div>

          <div id="note-content" className="space-y-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {note.title}
          </h1>

          {/* Executive Summary */}
          {note.summary && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/40 dark:from-slate-800/90 dark:to-slate-800/50 border border-blue-100 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Executive Summary
              </h4>
              <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium space-y-3">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                >
                  {prepareMarkdown(note.summary)}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* ── 1. Detailed Notes Content ── */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Detailed Study Notes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In-depth breakdown of concepts, mechanisms, and examples
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-base">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                  components={customMarkdownComponents}
                >
                  {prepareMarkdown(note.content)}
                </ReactMarkdown>
          </div>
        </section>

        {/* ── 2. Quick Revision Notes ── */}
        {note.shortNotes && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Quick Revision Key Points
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  High-yield takeaways for last-minute exam prep
                </p>
              </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-base">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                components={customMarkdownComponents}
              >
                {prepareMarkdown(note.shortNotes)}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* ── 3. Visual Flowcharts ── */}
        {note.mermaidCharts && note.mermaidCharts.length > 0 && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs mb-8">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ListFilter className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Visual Concepts & Flowcharts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Concept maps, flowcharts, and architecture diagrams
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {note.mermaidCharts.map((chart: string, idx: number) => (
                <div key={idx} className="w-full">
                  <MermaidRenderer chart={chart} />
                </div>
              ))}
            </div>
          </section>
        )}

        </div>

        {/* ── 4. Important Questions & Answers ── */}
        {normalizedQuestions.length > 0 && (
          <ImportantQuestionsSection
            questions={normalizedQuestions}
            topic={note.topic}
            classLevel={note.classLevel}
          />
        )}

        {/* ── 5. Practice MCQs ── */}
        {note.mcqs && note.mcqs.length > 0 && (
          <MCQSection
            noteId={note._id.toString()}
            initialMcqs={note.mcqs}
            initialAttempts={(note.quizAttempts || []) as any}
          />
        )}

        {/* Bottom CTA for Shared viewers */}
        <div className="mt-12 text-center p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg space-y-4">
          <Sparkles className="h-8 w-8 mx-auto text-yellow-300 animate-pulse" />
          <h3 className="text-2xl font-bold">Want to generate notes like this for your subjects?</h3>
          <p className="text-sm text-blue-100 max-w-md mx-auto">
            Create structured study notes, flashcards, flowcharts, and quizzes for any topic or textbook in seconds.
          </p>
          <Link href="/generate">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold gap-2 shadow-md mt-2">
              Start Generating Free Notes <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
