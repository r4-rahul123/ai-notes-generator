import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import Note from "@/lib/models/Note";
import { jsPDF } from "jspdf";

/**
 * Sanitizes strings for jsPDF standard fonts:
 * - Converts special math symbols and greek letters to clean ASCII equivalents
 * - Normalizes quotes, dashes, bullets, and special punctuation to standard ASCII
 * - PRESERVES backticks so code block splitter works perfectly!
 */
function cleanForPdf(text: string): string {
  if (!text) return "";
  return text
    // Replace math symbols and operators
    .replace(/[×✕]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[±]/g, "+/-")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/[≠]/g, "!=")
    .replace(/[≈]/g, "~=")
    .replace(/[→⇒]/g, "->")
    .replace(/[←⇐]/g, "<-")
    .replace(/[°]/g, " deg")
    .replace(/[²]/g, "^2")
    .replace(/[³]/g, "^3")
    .replace(/[πΠ]/g, "pi")
    .replace(/[μµ]/g, "u")
    .replace(/[Ω]/g, " Ohm")
    .replace(/[α]/g, "alpha")
    .replace(/[β]/g, "beta")
    .replace(/[γ]/g, "gamma")
    .replace(/[Δ]/g, "Delta")
    .replace(/[θ]/g, "theta")
    .replace(/[λ]/g, "lambda")
    .replace(/[∑]/g, "sum")
    .replace(/[√]/g, "sqrt")
    .replace(/[∞]/g, "inf")
    .replace(/[™®©]/g, "")
    // Replace typography punctuation
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    // Strip emoji glyphs
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/[^\x00-\x7F]/g, "") // Ensure pure ASCII compatibility for jsPDF standard fonts
    .trim();
}

/**
 * Renders a structured, clean PDF Table with accurate multi-page break management
 */
function renderPdfTable(
  doc: jsPDF,
  rows: string[][],
  margin: number,
  currentY: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number
): number {
  if (rows.length === 0) return currentY;

  const validRows = rows.filter(
    (r) => !r.every((cell) => /^[:\-\s]+$/.test(cell.trim()))
  );
  if (validRows.length === 0) return currentY;

  const numCols = validRows[0].length;
  if (numCols === 0) return currentY;

  const colWidth = contentWidth / numCols;
  let y = currentY;

  // Header Row Height
  const headers = validRows[0];
  const headerHeights = headers.map((h) => {
    const lines = doc.splitTextToSize(cleanForPdf(h).replace(/`/g, ""), colWidth - 14);
    return lines.length * 12 + 12;
  });
  const maxHeaderHeight = Math.max(22, ...headerHeights);

  // If table cannot fit header + first row, break to new page
  if (y + maxHeaderHeight + 30 > pageHeight - 50) {
    doc.addPage();
    y = 45;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32);
  }

  const drawHeader = () => {
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, maxHeaderHeight, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    headers.forEach((h, cIdx) => {
      const colX = margin + cIdx * colWidth;
      const lines = doc.splitTextToSize(cleanForPdf(h).replace(/`/g, ""), colWidth - 14);
      doc.text(lines, colX + 6, y + 13);
      if (cIdx > 0) {
        doc.line(colX, y, colX, y + maxHeaderHeight);
      }
    });

    y += maxHeaderHeight;
  };

  // Draw initial header
  drawHeader();

  // Data Rows
  const dataRows = validRows.slice(1);
  for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
    const row = dataRows[rIdx];

    const rowHeights = row.map((cell) => {
      const lines = doc.splitTextToSize(cleanForPdf(cell).replace(/`/g, ""), colWidth - 14);
      return lines.length * 12 + 10;
    });
    const maxRowHeight = Math.max(18, ...rowHeights);

    // If this row would overflow the page, break to new page and repeat header!
    if (y + maxRowHeight > pageHeight - 50) {
      doc.addPage();
      y = 45;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 32, pageWidth - margin, 32);
      drawHeader();
    }

    // Row Background (Zebra stripes)
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, maxRowHeight, "F");
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, maxRowHeight, "D");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    row.forEach((cell, cIdx) => {
      const colX = margin + cIdx * colWidth;
      const lines = doc.splitTextToSize(cleanForPdf(cell).replace(/`/g, ""), colWidth - 14);
      doc.text(lines, colX + 6, y + 11);
      if (cIdx > 0) {
        doc.line(colX, y, colX, y + maxRowHeight);
      }
    });

    y += maxRowHeight;
  }

  return y + 12;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const note = await Note.findById(id).lean();
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 45;

    const checkPageBreak = (neededHeight: number) => {
      if (yPos + neededHeight > pageHeight - 50) {
        doc.addPage();
        yPos = 45;
        // Top header divider on subsequent pages
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, 32, pageWidth - margin, 32);
      }
    };

    // ── Document Header ──
    const cleanTitle = cleanForPdf(note.title || note.topic);
    const cleanTopic = cleanForPdf(note.topic);
    const cleanLevel = cleanForPdf(note.classLevel);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate-900

    const titleLines = doc.splitTextToSize(cleanTitle, contentWidth - 20);
    const titleLineHeight = 22;
    const titleBlockHeight = titleLines.length * titleLineHeight;

    // Left blue accent bar matching dynamic title height
    doc.setFillColor(37, 99, 235); // Blue #2563eb
    doc.roundedRect(margin, yPos - 2, 4, titleBlockHeight + 4, 2, 2, "F");

    // Render Title Lines
    doc.text(titleLines, margin + 14, yPos + 14);
    yPos += titleBlockHeight + 16;

    // Badges / Metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const dateStr = new Date(note.createdAt || Date.now()).toLocaleDateString();
    doc.text(`Topic: ${cleanTopic}   •   Level: ${cleanLevel}   •   Date: ${dateStr}`, margin + 14, yPos);
    yPos += 18;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 22;

    // ── 1. Executive Summary ──
    if (note.summary) {
      checkPageBreak(80);
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175); // Blue-800
      doc.text("EXECUTIVE SUMMARY", margin + 10, yPos + 15);
      yPos += 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // Slate-700
      const cleanSummary = cleanForPdf(note.summary);
      const summaryLines = doc.splitTextToSize(cleanSummary, contentWidth);
      checkPageBreak(summaryLines.length * 14 + 10);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 14 + 20;
    }

    // ── 2. Detailed Notes Content ──
    if (note.content) {
      checkPageBreak(60);
      doc.setFillColor(243, 232, 255); // Purple-50
      doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(107, 33, 168); // Purple-800
      doc.text("DETAILED STUDY NOTES & CONCEPTS", margin + 10, yPos + 15);
      yPos += 30;

      // Clean whole content while keeping backticks intact
      const rawContent = cleanForPdf(note.content);
      const sections = rawContent.split(/```/);

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const isCodeBlock = sIdx % 2 === 1;

        if (isCodeBlock) {
          // 💻 Render Code Block in dark IDE style box
          const lines = section.trim().split("\n");
          const firstLine = lines[0].trim();
          const hasLang = firstLine.length < 20 && !firstLine.includes(" ") && !firstLine.includes("(");
          const lang = hasLang ? firstLine : "code";
          const codeLines = (hasLang ? lines.slice(1) : lines).join("\n");

          const splitCode = doc.splitTextToSize(codeLines, contentWidth - 24);
          const codeBodyHeight = splitCode.length * 12 + 16;
          const totalBoxHeight = codeBodyHeight + 20;

          // Ensure entire code block or first page fits with proper break
          checkPageBreak(Math.min(totalBoxHeight, 150));

          // 1. Code Container Outer Box (Dark Theme #0f172a)
          doc.setFillColor(15, 23, 42);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, yPos, contentWidth, totalBoxHeight, 4, 4, "FD");

          // 2. Code Header Bar
          doc.setFillColor(30, 41, 59); // Slate-800
          doc.rect(margin, yPos, contentWidth, 18, "F");

          // Window control dots
          doc.setFillColor(239, 68, 68); // Red dot
          doc.circle(margin + 10, yPos + 9, 2.5, "F");
          doc.setFillColor(245, 158, 11); // Yellow dot
          doc.circle(margin + 17, yPos + 9, 2.5, "F");
          doc.setFillColor(34, 197, 94); // Green dot
          doc.circle(margin + 24, yPos + 9, 2.5, "F");

          // Language Label
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(lang.toUpperCase(), margin + 34, yPos + 12);

          // 3. Code Lines
          doc.setFont("courier", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(248, 250, 252); // Crisp white/slate
          doc.text(splitCode, margin + 12, yPos + 32);

          yPos += totalBoxHeight + 14;
        } else {
          // Render markdown paragraphs, headers, and tables
          const paragraphs = section.split("\n");
          let pIdx = 0;

          while (pIdx < paragraphs.length) {
            const trimmed = paragraphs[pIdx].trim();
            if (!trimmed) {
              pIdx++;
              continue;
            }

            // Check if this is a Markdown Table row: starts and ends with |
            if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
              const tableRows: string[][] = [];
              while (pIdx < paragraphs.length && paragraphs[pIdx].trim().startsWith("|")) {
                const rowLine = paragraphs[pIdx].trim();
                const cells = rowLine
                  .split("|")
                  .slice(1, -1)
                  .map((c) => c.trim().replace(/`/g, ""));
                if (cells.length > 0) {
                  tableRows.push(cells);
                }
                pIdx++;
              }
              yPos = renderPdfTable(
                doc,
                tableRows,
                margin,
                yPos,
                contentWidth,
                pageHeight,
                pageWidth
              );
              continue;
            }

            // Horizontal Rule (--- or ***)
            if (/^[-*_]{3,}$/.test(trimmed)) {
              checkPageBreak(15);
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.5);
              doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
              yPos += 12;
              pIdx++;
              continue;
            }

            // Section Header (MUST have space after #, e.g. "## Header", not "#include")
            if (/^#{1,4}\s+/.test(trimmed)) {
              const headerText = trimmed.replace(/^#{1,4}\s+/, "").replace(/\*\*/g, "");
              checkPageBreak(35);
              yPos += 8;
              doc.setFont("helvetica", "bold");
              doc.setFontSize(12);
              doc.setTextColor(15, 23, 42);
              doc.text(headerText, margin, yPos);
              yPos += 16;
            } else if (trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
              // Bullet item
              const bulletText = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/`/g, "");
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9.5);
              doc.setTextColor(51, 65, 85);

              const lines = doc.splitTextToSize(bulletText, contentWidth - 14);
              checkPageBreak(lines.length * 13 + 4);
              doc.setFillColor(59, 130, 246);
              doc.circle(margin + 4, yPos - 3, 2, "F");
              doc.text(lines, margin + 12, yPos);
              yPos += lines.length * 13 + 4;
            } else {
              // Plain paragraph
              const plainText = trimmed.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`/g, "");
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9.5);
              doc.setTextColor(51, 65, 85);

              const lines = doc.splitTextToSize(plainText, contentWidth);
              checkPageBreak(lines.length * 13 + 6);
              doc.text(lines, margin, yPos);
              yPos += lines.length * 13 + 6;
            }
            pIdx++;
          }
        }
      }
      yPos += 14;
    }

    // ── 3. Quick Revision Notes ──
    if (note.shortNotes) {
      checkPageBreak(60);
      doc.setFillColor(254, 243, 199); // Amber-100
      doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(146, 64, 14); // Amber-800
      doc.text("QUICK REVISION & KEY POINTS", margin + 10, yPos + 15);
      yPos += 30;

      const cleanShort = cleanForPdf(note.shortNotes)
        .replace(/^#+\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/`/g, "");

      const shortParas = cleanShort.split("\n");
      for (const sp of shortParas) {
        const trimmed = sp.trim();
        if (!trimmed) continue;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);

        const lines = doc.splitTextToSize(trimmed.replace(/^[-*]\s*/, ""), contentWidth - 14);
        checkPageBreak(lines.length * 13 + 4);
        doc.setFillColor(245, 158, 11);
        doc.circle(margin + 4, yPos - 3, 2, "F");
        doc.text(lines, margin + 12, yPos);
        yPos += lines.length * 13 + 4;
      }
      yPos += 16;
    }

    // ── 4. Important Questions & Answers ──
    if (note.importantQuestions && note.importantQuestions.length > 0) {
      checkPageBreak(60);
      doc.setFillColor(255, 228, 230); // Rose-100
      doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(159, 18, 57); // Rose-800
      doc.text("IMPORTANT EXAM QUESTIONS & ANSWERS", margin + 10, yPos + 15);
      yPos += 30;

      note.importantQuestions.forEach((item: any, idx: number) => {
        const isObj = typeof item === "object" && item !== null;
        const qText = cleanForPdf(isObj ? item.question : String(item)).replace(/`/g, "");
        const aText = cleanForPdf(isObj ? item.answer || "" : "").replace(/`/g, "");

        checkPageBreak(40);

        // Question
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42); // Dark slate
        const qLines = doc.splitTextToSize(`Q${idx + 1}. ${qText}`, contentWidth);
        doc.text(qLines, margin, yPos);
        yPos += qLines.length * 13 + 5;

        // Answer (if provided)
        if (aText) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          const aLines = doc.splitTextToSize(`Ans: ${aText}`, contentWidth - 12);
          checkPageBreak(aLines.length * 12 + 6);
          doc.text(aLines, margin + 10, yPos);
          yPos += aLines.length * 12 + 10;
        } else {
          yPos += 6;
        }
      });
      yPos += 14;
    }

    // ── 5. Practice MCQs with Options & Solutions ──
    if (note.mcqs && note.mcqs.length > 0) {
      checkPageBreak(60);
      doc.setFillColor(224, 231, 255); // Indigo-100
      doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(55, 48, 163); // Indigo-800
      doc.text("PRACTICE MCQS & SOLUTIONS", margin + 10, yPos + 15);
      yPos += 30;

      note.mcqs.forEach((mcq: any, idx: number) => {
        checkPageBreak(60);
        const cleanQ = cleanForPdf(mcq.question).replace(/`/g, "");
        const cleanAns = cleanForPdf(mcq.correctAnswer).replace(/`/g, "");
        const options = Array.isArray(mcq.options) ? mcq.options : [];

        // MCQ Question
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        const qLines = doc.splitTextToSize(`${idx + 1}. ${cleanQ}`, contentWidth);
        doc.text(qLines, margin, yPos);
        yPos += qLines.length * 13 + 5;

        // Options List (A, B, C, D)
        if (options.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105); // Slate-600

          const optionLabels = ["A", "B", "C", "D", "E", "F"];
          options.forEach((opt: string, optIdx: number) => {
            const cleanOpt = cleanForPdf(String(opt)).replace(/`/g, "");
            const label = optionLabels[optIdx] || `${optIdx + 1}`;
            const optLines = doc.splitTextToSize(`(${label}) ${cleanOpt}`, contentWidth - 20);
            checkPageBreak(optLines.length * 12 + 3);
            doc.text(optLines, margin + 12, yPos);
            yPos += optLines.length * 12 + 3;
          });
          yPos += 4;
        }

        // Correct Answer Box directly underneath
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(22, 101, 52); // Green-800
        const ansLines = doc.splitTextToSize(`Correct Answer: ${cleanAns}`, contentWidth - 24);
        const ansHeight = ansLines.length * 12 + 8;

        checkPageBreak(ansHeight + 8);
        doc.setFillColor(240, 253, 244); // Green-50
        doc.setDrawColor(187, 247, 208); // Green-200
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 6, yPos, contentWidth - 12, ansHeight, 3, 3, "FD");
        doc.text(ansLines, margin + 14, yPos + 10);

        yPos += ansHeight + 14;
      });
    }

    // ── Page Numbers & Footer ──
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(
        `AI Notes Generator  •  Page ${p} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 18,
        { align: "center" }
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const safeFilename = encodeURIComponent(
      cleanTopic.replace(/\s+/g, "_") || "Study_Notes"
    );

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}_Notes.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF document" },
      { status: 500 }
    );
  }
}
