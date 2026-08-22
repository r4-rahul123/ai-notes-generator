"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";

interface PDFExportButtonProps {
  noteId?: string;
  filename?: string;
  elementId?: string;
}

export default function PDFExportButton({
  noteId,
  filename = "Study_Notes",
}: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDirectDownload = async () => {
    if (!noteId) {
      toast.error("Note ID not found for PDF download");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Generating your PDF document...");

    try {
      const res = await fetch(`/api/notes/${noteId}/pdf`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\s+/g, "_")}_Notes.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF downloaded successfully! 📄", { id: toastId });
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error(err.message || "Could not generate PDF", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDirectDownload}
      variant="outline"
      className="gap-2 font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Download PDF</span>
        </>
      )}
    </Button>
  );
}
