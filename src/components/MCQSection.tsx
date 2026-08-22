"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Award,
  RotateCcw,
  CheckCircle2,
  XCircle,
  History,
  Sparkles,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trophy,
} from "lucide-react";

export interface MCQItem {
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
}

export interface QuizAttempt {
  _id?: string;
  attemptNumber: number;
  score: number;
  total: number;
  submittedAt: string | Date;
  mcqs: MCQItem[];
}

interface MCQSectionProps {
  noteId: string;
  initialMcqs: MCQItem[];
  initialAttempts?: QuizAttempt[];
}

export default function MCQSection({
  noteId,
  initialMcqs,
  initialAttempts = [],
}: MCQSectionProps) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>(initialAttempts);
  const [currentMcqs, setCurrentMcqs] = useState<MCQItem[]>(initialMcqs);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);

  // Tab: 'live' or 'history'
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(
    attempts.length > 0 ? attempts[attempts.length - 1].attemptNumber : null
  );

  const totalAttemptsMade = attempts.length;
  const maxAttempts = 5;
  const isMaxReached = totalAttemptsMade >= maxAttempts;

  // Best score calculation
  const bestScore = attempts.reduce(
    (max, att) => Math.max(max, att.score),
    0
  );
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  // Handle Quiz Submission
  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      toast.error("Please answer at least one question before submitting.");
      return;
    }

    if (isMaxReached) {
      toast.error("Maximum 5 quiz attempts reached for this note.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/mcq/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, mcqs: currentMcqs }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quiz");
      }

      const newAtt: QuizAttempt = data.attempt;
      setAttempts((prev) => [...prev, newAtt]);
      setCurrentScore(newAtt.score);
      setSubmitted(true);
      toast.success(`Quiz submitted! You scored ${newAtt.score}/${newAtt.total} 🎉`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Try Again" with Fresh MCQs
  const handleGenerateNewMCQs = async () => {
    if (isMaxReached) {
      toast.info("You have already used all 5 attempts. Review your past scores below!");
      return;
    }

    setGeneratingNew(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/mcq/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate new MCQs");
      }

      setCurrentMcqs(data.mcqs);
      setAnswers({});
      setSubmitted(false);
      setCurrentScore(null);
      setActiveTab("live");
      toast.success("Generated brand new questions for this attempt! 🎯");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate new questions");
    } finally {
      setGeneratingNew(false);
    }
  };

  const getOptionClass = (opt: string, index: number) => {
    const isSelected = answers[index] === opt;
    const isCorrect = currentMcqs[index].correctAnswer === opt;

    const base = "w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium border flex items-center justify-between ";

    if (submitted) {
      if (isCorrect)
        return base + "bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300 cursor-default shadow-xs";
      if (isSelected && !isCorrect)
        return base + "bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300 cursor-default shadow-xs";
      return base + "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-default opacity-60";
    }

    if (isSelected)
      return base + "bg-blue-50 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500 text-blue-800 dark:text-blue-200 cursor-pointer ring-2 ring-blue-400/20";

    return base + "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer";
  };

  return (
    <div id="mcq-section" className="space-y-8 scroll-mt-20">
      {/* Top Banner / Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
              <Award className="h-5 w-5" />
            </span>
            Interactive MCQ Practice
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Test your knowledge. Up to 5 unique attempts allowed with fresh AI questions.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "live"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            {submitted ? "Current Result" : "Take Quiz"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="h-3.5 w-3.5 text-blue-500" />
            Past Scores ({attempts.length})
          </button>
        </div>
      </div>

      {/* Attempt Counter & Progress Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quiz Progress
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Attempt {Math.min(totalAttemptsMade + (submitted ? 0 : 1), maxAttempts)} of {maxAttempts}
            </span>
            {isMaxReached && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Max Attempts Reached
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isMaxReached
              ? "All 5 attempts completed. You can review past answers anytime!"
              : `${maxAttempts - totalAttemptsMade} attempt(s) remaining with brand new questions.`}
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {latestAttempt && (
            <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
              <p className="text-xs text-slate-400 font-medium">Latest Score</p>
              <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                {latestAttempt.score} / {latestAttempt.total}
              </p>
            </div>
          )}
          {attempts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
              <p className="text-xs text-slate-400 font-medium">Best Score</p>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                {bestScore} / {attempts[0]?.total || currentMcqs.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── TAB 1: LIVE QUIZ OR CURRENT RESULT ── */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {currentMcqs.map((mcq, index) => (
            <Card
              key={index}
              className="border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden"
            >
              <CardContent className="p-5 sm:p-6">
                <h4 className="font-semibold mb-4 text-base sm:text-lg text-slate-900 dark:text-white leading-snug flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{mcq.question}</span>
                </h4>
                <div className="space-y-2.5">
                  {mcq.options.map((opt, optIndex) => (
                    <button
                      key={optIndex}
                      disabled={submitted || isMaxReached && submitted}
                      onClick={() =>
                        !submitted &&
                        setAnswers({ ...answers, [index]: opt })
                      }
                      className={getOptionClass(opt, index)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex-shrink-0">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </div>
                      {submitted && mcq.correctAnswer === opt && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                      )}
                      {submitted &&
                        answers[index] === opt &&
                        mcq.correctAnswer !== opt && (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 ml-2" />
                        )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Submission Result / Action Buttons */}
          {submitted ? (
            <div
              className={`p-6 sm:p-8 rounded-2xl text-center border shadow-xs animate-scale-in ${
                (currentScore || 0) >= currentMcqs.length / 2
                  ? "bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xs mb-3">
                <Trophy
                  className={`h-8 w-8 ${
                    (currentScore || 0) >= currentMcqs.length / 2
                      ? "text-green-500"
                      : "text-amber-500"
                  }`}
                />
              </div>
              <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Score: {currentScore} / {currentMcqs.length}
              </h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm sm:text-base max-w-md mx-auto">
                {currentScore === currentMcqs.length
                  ? "Outstanding! You got a perfect 100% score on this quiz! 🎉"
                  : (currentScore || 0) >= currentMcqs.length / 2
                  ? "Great job! You passed with a solid understanding of the concepts. 👍"
                  : "Good attempt! Review the correct answers above and try with fresh questions. 💪"}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!isMaxReached ? (
                  <Button
                    onClick={handleGenerateNewMCQs}
                    disabled={generatingNew}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 px-6 h-11"
                  >
                    {generatingNew ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Fresh MCQs...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Try Again (Get New MCQs)
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    Maximum 5 attempts reached. Click below to inspect all past attempts.
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setActiveTab("history")}
                  className="gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 h-11"
                >
                  <History className="h-4 w-4" /> View All Past Scores ({attempts.length})
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length === 0}
                className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Answers...
                  </>
                ) : (
                  `Submit Answers (${Object.keys(answers).length}/${currentMcqs.length} answered)`
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PAST SCORES & ANSWERS HISTORY ── */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          {attempts.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <History className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                No past quiz attempts yet
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Take the quiz above to record your score, review correct answers, and track your progress.
              </p>
              <Button onClick={() => setActiveTab("live")} className="gap-2">
                <Sparkles className="h-4 w-4" /> Start Quiz Now
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Attempt History ({attempts.length} of {maxAttempts})
                </h4>
                {!isMaxReached && (
                  <Button
                    size="sm"
                    onClick={handleGenerateNewMCQs}
                    disabled={generatingNew}
                    className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {generatingNew ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    New Attempt
                  </Button>
                )}
              </div>

              {attempts.map((att) => {
                const isExpanded = expandedAttempt === att.attemptNumber;
                const formattedDate = new Date(att.submittedAt).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
                const percent = Math.round((att.score / att.total) * 100);

                return (
                  <div
                    key={att.attemptNumber}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() =>
                        setExpandedAttempt(isExpanded ? null : att.attemptNumber)
                      }
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                            percent >= 80
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : percent >= 50
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {att.score}/{att.total}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                            Attempt #{att.attemptNumber}
                            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formattedDate}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Accuracy: {percent}% · Click to {isExpanded ? "hide" : "view"} questions & answers
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                          {isExpanded ? "Close Answers" : "View Answers"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Answers Section */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-fade-in">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1">
                          Questions & Answers for Attempt #{att.attemptNumber}
                        </p>

                        {att.mcqs.map((q, qIdx) => {
                          const isUserCorrect = q.userAnswer === q.correctAnswer;
                          const wasAnswered = Boolean(q.userAnswer);

                          return (
                            <div
                              key={qIdx}
                              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                                  <span className="text-indigo-600 dark:text-indigo-400 mr-2 font-bold">
                                    Q{qIdx + 1}.
                                  </span>
                                  {q.question}
                                </p>
                                {wasAnswered ? (
                                  isUserCorrect ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 flex items-center gap-1 flex-shrink-0">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center gap-1 flex-shrink-0">
                                      <XCircle className="h-3.5 w-3.5" /> Incorrect
                                    </span>
                                  )
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 flex-shrink-0">
                                    <AlertCircle className="h-3.5 w-3.5" /> Skipped
                                  </span>
                                )}
                              </div>

                              {/* Options List */}
                              <div className="space-y-1.5 pl-2 sm:pl-4">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = q.userAnswer === opt;
                                  const isCorrect = q.correctAnswer === opt;

                                  let optionStyle =
                                    "p-2.5 rounded-lg text-xs sm:text-sm flex items-center justify-between border ";

                                  if (isCorrect) {
                                    optionStyle +=
                                      "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-700 text-green-900 dark:text-green-200 font-semibold";
                                  } else if (isSelected && !isCorrect) {
                                    optionStyle +=
                                      "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 font-medium";
                                  } else {
                                    optionStyle +=
                                      "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300";
                                  }

                                  return (
                                    <div key={oIdx} className={optionStyle}>
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-600 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-500">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span>{opt}</span>
                                      </div>
                                      {isCorrect && (
                                        <span className="text-xs text-green-700 dark:text-green-300 font-bold ml-2">
                                          Correct Answer ✓
                                        </span>
                                      )}
                                      {isSelected && !isCorrect && (
                                        <span className="text-xs text-red-700 dark:text-red-300 font-bold ml-2">
                                          Your Choice ✗
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
