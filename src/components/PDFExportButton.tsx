"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

interface PDFExportButtonProps {
  noteId?: string;
  filename?: string;
  noteTitle?: string;
  topic?: string;
  classLevel?: string;
  createdAt?: string;
}

export default function PDFExportButton({
  noteId,
}: PDFExportButtonProps) {
  const handleDirectDownload = async () => {
    if (!noteId) {
      toast.error("Note ID not found for PDF download");
      return;
    }

    // Native browser print gives the best quality for KaTeX math, Mermaid
    // diagrams, and complex UI — vector output, selectable text, and the
    // print stylesheet renders Q&A + MCQ solutions (no options).
    const isNotePage =
      typeof window !== "undefined" &&
      window.location.pathname.includes(`/notes/${noteId}`);

    if (isNotePage) {
      window.print();
    } else {
      window.open(`/notes/${noteId}?print=true`, "_blank");
    }
  };

  return (
    <Button
      onClick={handleDirectDownload}
      variant="outline"
      className="gap-2 font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
    >
      <FileDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span>Download PDF</span>
    </Button>
  );
}
