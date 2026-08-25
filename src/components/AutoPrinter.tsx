"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AutoPrinter() {
  const searchParams = useSearchParams();
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (searchParams.get("print") === "true" && !isPrinting) {
      setIsPrinting(true);
      // Wait for ReactMarkdown, KaTeX, and Mermaid to fully render
      const timer = setTimeout(() => {
        window.print();
        // Optional: close window after print dialog is closed if opened in new tab
        // We'll just leave it open so they can read it if they cancel.
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [searchParams, isPrinting]);

  return null;
}
