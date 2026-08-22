"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface MermaidRendererProps {
  chart: string;
}

/**
 * Robust line-by-line sanitizer for AI-generated Mermaid charts:
 * - Normalizes escaped newlines and linebreaks
 * - Strips markdown backticks
 * - Strips conflicting inline AI color styles so all nodes have uniform, readable contrast
 * - Correctly wraps all node label text in quotes without creating illegal nested quotes
 * - Handles links, arrow labels (|...|), and shape definitions
 */
function sanitizeMermaid(code: string): string {
  if (!code) return "";
  let clean = code.trim();

  // Normalize newlines (handle literal \n from JSON strings)
  clean = clean.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  // Strip markdown code fences
  clean = clean.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Process line-by-line
  const lines = clean.split("\n");
  const processed = lines.map((line) => {
    let l = line.trim();
    if (!l) return "";

    // Skip AI-injected style definitions that cause unreadable pastel fills
    if (l.startsWith("style ") || l.startsWith("classDef ") || l.startsWith("class ")) {
      return "";
    }

    if (
      l.startsWith("graph") ||
      l.startsWith("flowchart") ||
      l.startsWith("sequenceDiagram") ||
      l.startsWith("classDiagram") ||
      l.startsWith("erDiagram") ||
      l.startsWith("stateDiagram")
    ) {
      return l;
    }

    // 1. Clean and wrap Square Bracket Nodes: Node[ ... ]
    l = l.replace(
      /(\b[A-Za-z0-9_]+)\s*\[([\s\S]*?)\](?=\s*(?:-->|---|==>|-.->|\||$))/g,
      (match, id, content) => {
        let inner = content.trim();
        if (inner.startsWith('"') && inner.endsWith('"') && inner.length >= 2) {
          inner = inner.slice(1, -1);
        }
        inner = inner.replace(/"/g, "'").trim();
        return `${id}["${inner}"]`;
      }
    );

    // 2. Clean and wrap Round Bracket Nodes: Node( ... )
    l = l.replace(
      /(\b[A-Za-z0-9_]+)\s*\(([\s\S]*?)\)(?=\s*(?:-->|---|==>|-.->|\||$))/g,
      (match, id, content) => {
        let inner = content.trim();
        if (inner.startsWith('"') && inner.endsWith('"') && inner.length >= 2) {
          inner = inner.slice(1, -1);
        }
        inner = inner.replace(/"/g, "'").trim();
        return `${id}("${inner}")`;
      }
    );

    return l;
  });

  return processed.filter(Boolean).join("\n");
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart) return;

      const cleanCode = sanitizeMermaid(chart);
      const isDark =
        resolvedTheme === "dark" ||
        (typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark"));

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          themeVariables: isDark
            ? {
                darkMode: true,
                background: "#0f172a",
                primaryColor: "#1e293b",
                primaryTextColor: "#ffffff",
                primaryBorderColor: "#60a5fa",
                lineColor: "#93c5fd",
                secondaryColor: "#1e293b",
                tertiaryColor: "#0f172a",
                mainBkg: "#1e293b",
                nodeBorder: "#60a5fa",
                clusterBkg: "#0f172a",
                clusterBorder: "#3b82f6",
                titleColor: "#ffffff",
                edgeLabelBackground: "#1e293b",
                actorTextColor: "#ffffff",
                actorLineColor: "#93c5fd",
                signalColor: "#93c5fd",
                signalTextColor: "#ffffff",
              }
            : {
                darkMode: false,
                background: "#ffffff",
                primaryColor: "#eff6ff",
                primaryTextColor: "#0f172a",
                primaryBorderColor: "#3b82f6",
                lineColor: "#2563eb",
                mainBkg: "#f8fafc",
                nodeBorder: "#3b82f6",
              },
          securityLevel: "loose",
          suppressErrorRendering: true,
        });

        // Safe CSS selector ID
        const id = `mmd_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

        // Clean up any stale temp elements
        const oldTemp = document.getElementById(`d${id}`);
        if (oldTemp) oldTemp.remove();

        const { svg } = await mermaid.render(id, cleanCode);

        if (isMounted) {
          setSvgContent(svg);
          setRenderError(false);
        }
      } catch (err) {
        console.warn("Mermaid render failed:", err);
        if (isMounted) {
          setRenderError(true);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, resolvedTheme]);

  if (renderError) {
    return (
      <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans text-xs flex items-center gap-1.5">
          📊 Flowchart / Concept Map:
        </p>
        <pre className="whitespace-pre-wrap">{sanitizeMermaid(chart)}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-wrapper flex justify-center overflow-x-auto my-6 p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs [&_svg]:max-w-full [&_svg]:h-auto dark:[&_svg_.edgePath_.path]:!stroke-[#60a5fa] dark:[&_svg_.flowchart-link]:!stroke-[#60a5fa] dark:[&_svg_.marker]:!fill-[#60a5fa] dark:[&_svg_.marker]:!stroke-[#60a5fa] dark:[&_svg_.nodeLabel]:!fill-white dark:[&_svg_.nodeLabel]:!color-white dark:[&_svg_text]:!fill-white dark:[&_svg_.node_rect]:!fill-[#1e293b] dark:[&_svg_.node_rect]:!stroke-[#60a5fa] dark:[&_svg_.node_polygon]:!fill-[#1e293b] dark:[&_svg_.node_polygon]:!stroke-[#60a5fa] dark:[&_svg_.node_circle]:!fill-[#1e293b] dark:[&_svg_.node_circle]:!stroke-[#60a5fa]"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
