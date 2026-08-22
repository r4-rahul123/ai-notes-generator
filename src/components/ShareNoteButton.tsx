"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Check,
  Copy,
  MessageCircle,
  Globe,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface ShareNoteButtonProps {
  noteId: string;
  noteTitle: string;
  topic: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function ShareNoteButton({
  noteId,
  noteTitle,
  topic,
  variant = "outline",
  size = "default",
  className = "",
}: ShareNoteButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getShareUrl = () => {
    const customBase = process.env.NEXT_PUBLIC_APP_URL;
    if (customBase) {
      return `${customBase.replace(/\/$/, "")}/share/${noteId}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${noteId}`;
    }
    return `/share/${noteId}`;
  };

  const handleCopy = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Public study link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const message = `📚 Check out these AI Study Notes on "${topic || noteTitle}":\n${url}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`gap-1.5 font-medium transition-all ${className}`}
        title="Share study notes with friends"
      >
        <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span>Share</span>
      </Button>

      {/* 🌟 Compact & Sleek Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Backdrop Click */}
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />

          {/* Compact Modal Box */}
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl z-10 animate-scale-in text-left">
            {/* Top Bar: Title & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Share Study Note
                </h3>
              </div>

              {/* Prominent Close X Button */}
              <button
                suppressHydrationWarning
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Note Snippet */}
            <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
                  {topic || "Note"}
                </p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {noteTitle}
                </p>
              </div>
            </div>

            {/* URL Box with 1-Click Copy */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <input
                  suppressHydrationWarning
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="bg-transparent px-2 text-xs text-slate-700 dark:text-slate-300 w-full outline-none font-mono select-all truncate"
                />
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className={`shrink-0 text-xs h-7 px-2.5 font-semibold transition-all ${
                    copied
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Actions: WhatsApp & Preview */}
            <div className="space-y-2">
              {/* WhatsApp Button */}
              <button
                suppressHydrationWarning
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 fill-white text-emerald-600" />
                Share on WhatsApp
              </button>

              {/* Open in New Tab Button */}
              <a
                href={getShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                Open Public Preview
              </a>
            </div>

            {/* Bottom Dismiss Button */}
            <button
              suppressHydrationWarning
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
