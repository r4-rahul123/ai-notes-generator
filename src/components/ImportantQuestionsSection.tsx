"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { prepareMarkdown } from "@/lib/prepareMarkdown";
import CodeBlock from "@/components/CodeBlock";
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import MathText from "@/components/MathText";

export interface QuestionItem {
  question: string;
  answer?: string;
}

interface ImportantQuestionsSectionProps {
  questions: Array<string | QuestionItem>;
  topic?: string;
  classLevel?: string;
}

/**
 * Normalizes AI markdown output (escaped newlines and line breaks)
 */
function formatAnswerMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Convert literal "\n" escapes to real newlines, but NEVER when followed by
    // a lowercase letter — that is a LaTeX command (\nu, \nabla, \neq, \newline,
    // \notin, ...) and splitting it breaks every math span in the answer.
    .replace(/\\n(?![a-z])/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

// Custom Markdown components for clean answer formatting
const answerMarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 flex items-center gap-2">
      <span className="w-1 h-4 bg-indigo-600 rounded-full inline-block" />
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base mb-3 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-2.5 my-3 pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="space-y-2.5 my-3 pl-4 list-decimal marker:text-indigo-600 dark:marker:text-indigo-400 marker:font-bold">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2 flex-shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-slate-900 dark:text-white">
      {children}
    </strong>
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
        className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs sm:text-sm border border-blue-200 dark:border-blue-800/60"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }: any) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
      <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="bg-slate-100 dark:bg-slate-800 px-4 py-3 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 border-t border-r border-slate-100 dark:border-slate-700/60 last:border-r-0">
      {children}
    </td>
  ),
};

export default function ImportantQuestionsSection({
  questions,
  topic,
  classLevel,
}: ImportantQuestionsSectionProps) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<number, string>>({});
  const [loadingAnswers, setLoadingAnswers] = useState<Record<number, boolean>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<number, string>>({});

  if (!questions || questions.length === 0) return null;

  const fetchAnswerIfNeeded = async (idx: number, qText: string, existingAns?: string) => {
    if (existingAns || dynamicAnswers[idx] || loadingAnswers[idx]) return;

    setLoadingAnswers((prev) => ({ ...prev, [idx]: true }));
    setFetchErrors((prev) => ({ ...prev, [idx]: "" }));

    try {
      const res = await fetch("/api/answer-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText, topic, classLevel }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setDynamicAnswers((prev) => ({ ...prev, [idx]: data.answer }));
      } else {
        throw new Error(data.error || "Failed to fetch answer");
      }
    } catch (err: any) {
      console.error("Failed to fetch answer:", err);
      setFetchErrors((prev) => ({ ...prev, [idx]: err.message || "Failed to load answer" }));
    } finally {
      setLoadingAnswers((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const toggleExpand = (idx: number, qText: string, existingAns?: string) => {
    const nextState = !expandedIndices[idx];
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: nextState,
    }));

    if (nextState) {
      fetchAnswerIfNeeded(idx, qText, existingAns);
    }
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    questions.forEach((item, idx) => {
      all[idx] = true;
      const isObject = typeof item === "object" && item !== null;
      const qText = isObject ? (item as QuestionItem).question : String(item);
      const existingAns = isObject ? (item as QuestionItem).answer : undefined;
      fetchAnswerIfNeeded(idx, qText, existingAns);
    });
    setExpandedIndices(all);
  };

  const collapseAll = () => {
    setExpandedIndices({});
  };

  const allExpanded =
    questions.length > 0 &&
    questions.every((_, idx) => Boolean(expandedIndices[idx]));

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
            <HelpCircle className="h-4 w-4" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Important Exam Questions & Answers
          </h2>
        </div>

        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 transition-colors"
        >
          {allExpanded ? "Collapse All Answers" : "Expand All Answers"}
        </button>
      </div>

      {/* Questions List */}
      <div className="grid gap-3.5 sm:grid-cols-1">
        {questions.map((item, idx) => {
          const isObject = typeof item === "object" && item !== null;
          const questionText = isObject ? (item as QuestionItem).question : String(item);
          const rawAnswer = isObject ? (item as QuestionItem).answer : null;
          const answerText = rawAnswer || dynamicAnswers[idx];
          const isExpanded = Boolean(expandedIndices[idx]);
          const isLoading = Boolean(loadingAnswers[idx]);
          const errorMsg = fetchErrors[idx];

          return (
            <div
              key={idx}
              className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs overflow-hidden transition-all"
            >
              {/* Question Header Row */}
              <div
                onClick={() => toggleExpand(idx, questionText, rawAnswer || undefined)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors select-none"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-900">
                    Q{idx + 1}
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 text-base font-semibold leading-relaxed">
                    <MathText>{questionText}</MathText>
                  </p>
                </div>

                <div className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 text-slate-500 dark:text-slate-400">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Answer Content Dropdown */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 bg-white dark:bg-slate-800/90 border-t border-slate-200/70 dark:border-slate-700/70 animate-fade-in">
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Model Answer:
                    </p>

                    {isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Generating structured model answer...
                      </div>
                    ) : errorMsg ? (
                      <div className="flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400 py-2">
                        <span>Failed to load answer: {errorMsg}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchAnswerIfNeeded(idx, questionText, rawAnswer || undefined);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium"
                        >
                          <RotateCcw className="h-3 w-3" /> Retry
                        </button>
                      </div>
                    ) : (
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
                          components={answerMarkdownComponents}
                        >
                          {prepareMarkdown(
                            formatAnswerMarkdown(
                              answerText || "Answer could not be generated. Please click to retry."
                            )
                          )}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
