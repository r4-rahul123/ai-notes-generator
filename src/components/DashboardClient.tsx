"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShareNoteButton from "@/components/ShareNoteButton";
import PDFExportButton from "@/components/PDFExportButton";
import {
  FileText,
  PlusCircle,
  Coins,
  ArrowRight,
  Search,
  Trophy,
  Target,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  Flame,
  ListFilter,
  CheckCircle2,
  X,
  LineChart,
  BrainCircuit,
  Trash2,
} from "lucide-react";

interface NoteItem {
  _id: string;
  title: string;
  topic: string;
  classLevel: string;
  summary: string;
  createdAt: string | Date;
  mermaidCharts?: string[];
  mcqs?: any[];
  quizAttempts?: Array<{
    score: number;
    total: number;
    submittedAt: string | Date;
  }>;
}

interface DashboardClientProps {
  initialNotes: NoteItem[];
  userCredits: number;
}

export default function DashboardClient({
  initialNotes,
  userCredits,
}: DashboardClientProps) {
  const router = useRouter();
  const [notesList, setNotesList] = useState<NoteItem[]>(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "score" | "title">("newest");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    
    setIsDeleting(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (res.ok) {
        setNotesList((prev) => prev.filter((n) => n._id !== noteId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete note");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsDeleting(null);
    }
  };

  // ── 1. Calculate Student Study Analytics (Feature 5) ──
  const analytics = useMemo(() => {
    let totalAttempts = 0;
    let totalScoreSum = 0;
    let totalQuestionsAnswered = 0;
    let totalCharts = 0;

    notesList.forEach((note) => {
      totalCharts += note.mermaidCharts?.length || 0;
      if (note.quizAttempts && note.quizAttempts.length > 0) {
        note.quizAttempts.forEach((att) => {
          totalAttempts++;
          totalScoreSum += att.score;
          totalQuestionsAnswered += att.total;
        });
      }
    });

    const averageAccuracy =
      totalQuestionsAnswered > 0
        ? Math.round((totalScoreSum / totalQuestionsAnswered) * 100)
        : 0;

    return {
      totalNotes: notesList.length,
      totalAttempts,
      averageAccuracy,
      totalCharts,
      totalQuestionsAnswered,
    };
  }, [notesList]);

  // Extract unique class levels for filter chips
  const classLevels = useMemo(() => {
    const levels = new Set<string>();
    notesList.forEach((n) => {
      if (n.classLevel) levels.add(n.classLevel.trim());
    });
    return ["all", ...Array.from(levels)];
  }, [notesList]);

  // ── 2. Filter & Sort Notes (Feature 3) ──
  const filteredNotes = useMemo(() => {
    return notesList
      .filter((note) => {
        // Level filter
        if (selectedLevel !== "all" && note.classLevel.toLowerCase() !== selectedLevel.toLowerCase()) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = note.title?.toLowerCase().includes(q);
          const matchTopic = note.topic?.toLowerCase().includes(q);
          const matchSummary = note.summary?.toLowerCase().includes(q);
          return matchTitle || matchTopic || matchSummary;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "title") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "score") {
          const bestA = Math.max(0, ...(a.quizAttempts?.map((att) => att.score / (att.total || 1)) || [0]));
          const bestB = Math.max(0, ...(b.quizAttempts?.map((att) => att.score / (att.total || 1)) || [0]));
          return bestB - bestA;
        }
        return 0;
      });
  }, [notesList, searchQuery, selectedLevel, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-6xl mx-auto py-10 px-4">
        {/* ── Top Header Bar ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in-up">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              Student Learning Space
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Study Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
              Search, revise, take quizzes, and share your notes
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Credits badge */}
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-full font-semibold border border-amber-200 dark:border-amber-800/80 text-sm shadow-xs">
              <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>{userCredits} Credits</span>
            </div>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 text-sm"
              >
                Buy Credits
              </Button>
            </Link>
            <Link href="/generate">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 font-semibold text-sm">
                <PlusCircle className="h-4 w-4" /> New Note
              </Button>
            </Link>
          </div>
        </div>

        {/* ── 📊 Feature 5: Student Study Analytics Stats Widget ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Stat 1: Total Notes */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {analytics.totalNotes}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total Notes Created
              </p>
            </div>
          </div>

          {/* Stat 2: Quiz Accuracy */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {analytics.averageAccuracy}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Quiz Avg Accuracy
              </p>
            </div>
          </div>

          {/* Stat 3: Quizzes Completed */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {analytics.totalAttempts}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Quiz Tests Taken
              </p>
            </div>
          </div>

          {/* Stat 4: Visual Flowcharts */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {analytics.totalCharts}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Visual Flowcharts
              </p>
            </div>
          </div>
        </div>

        {/* ── 🔍 Feature 3: Search, Filters & Sorting Controls ── */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search notes by topic, title, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
              {searchQuery && (
                <button
                  suppressHydrationWarning
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                suppressHydrationWarning
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="score">Sort: Highest Quiz Score</option>
                <option value="title">Sort: Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <ListFilter className="h-3.5 w-3.5" /> Filter Level:
            </span>
            {classLevels.map((lvl) => (
              <button
                key={lvl}
                suppressHydrationWarning
                onClick={() => setSelectedLevel(lvl)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all capitalize ${
                  selectedLevel === lvl
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {lvl === "all" ? "All Levels" : lvl}
              </button>
            ))}

            <span className="ml-auto text-xs font-medium text-slate-400 font-mono">
              Showing {filteredNotes.length} of {notesList.length}
            </span>
          </div>
        </div>

        {/* ── Notes Grid ── */}
        {notesList.length === 0 ? (
          /* Empty Notes State */
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <FileText className="h-14 w-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              No notes created yet
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-sm mx-auto">
              Start your study session by generating notes for any topic or textbook.
            </p>
            <Link href="/generate">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Generate Your First Note <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : filteredNotes.length === 0 ? (
          /* Zero Search Results State */
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No notes matching &quot;{searchQuery}&quot;
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Try adjusting your search query or selecting &quot;All Levels&quot;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedLevel("all");
              }}
              className="mt-2"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => {
              const bestScore =
                note.quizAttempts && note.quizAttempts.length > 0
                  ? Math.max(...note.quizAttempts.map((a) => a.score))
                  : null;
              const maxTotal = note.quizAttempts?.[0]?.total || 5;

              return (
                <Card
                  key={note._id}
                  className="card-hover border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 rounded-3xl shadow-xs flex flex-col justify-between overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800/70 truncate">
                        {note.topic}
                      </span>
                      <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {note.classLevel}
                      </span>
                    </div>

                    <CardTitle className="line-clamp-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {note.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                      {note.summary}
                    </p>

                    {/* Quick Stats Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {bestScore !== null ? (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          Best: {bestScore}/{maxTotal}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                          Quiz Unattempted
                        </span>
                      )}

                      {note.mermaidCharts && note.mermaidCharts.length > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Sparkles className="h-3 w-3" />
                          {note.mermaidCharts.length} Diagrams
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    {/* View Button */}
                    <Link href={`/notes/${note._id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 font-semibold gap-1 text-xs"
                      >
                        Study Note <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    {/* Share Button (Feature 2) */}
                    <ShareNoteButton
                      noteId={note._id}
                      noteTitle={note.title}
                      topic={note.topic}
                      size="sm"
                      variant="outline"
                    />

                    {/* PDF Export Button */}
                    <PDFExportButton noteId={note._id} />

                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 px-2"
                      onClick={() => handleDelete(note._id)}
                      disabled={isDeleting === note._id}
                      title="Delete Note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
