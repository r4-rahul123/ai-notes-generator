"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  GripVertical,
  Loader2,
  MessageCircle,
  Send,
  User,
  X,
  Sparkles,
  Database,
  CheckCircle2,
} from "lucide-react";

interface RagSource {
  chunkIndex: number;
  similarity: number;
  snippet: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
}

interface NoteContext {
  title: string;
  topic: string;
  classLevel: string;
  summary: string;
  content: string;
  shortNotes: string;
  importantQuestions: string[];
}

interface NoteChatProps {
  noteId: string;
  noteContext: NoteContext;
}

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 580;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 750;
const MAX_HEIGHT = 850;

export default function NoteChat({ noteId, noteContext }: NoteChatProps) {
  const STORAGE_KEY = `chat_history_${noteId}`;
  const SIZE_KEY = `chat_size_${noteId}`;

  const getInitialMessages = (): Message[] => {
    const welcomeMsg: Message = {
      role: "assistant",
      content: `Hi! 👋 I'm your **RAG-Powered AI Tutor** for **"${noteContext.title}"**.\n\nAsk me any question — I search vector embeddings of your document to give accurate, grounded answers!`,
    };
    if (typeof window === "undefined") return [welcomeMsg];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        return parsed.length > 0 ? parsed : [welcomeMsg];
      }
    } catch {}
    return [welcomeMsg];
  };

  const getInitialSize = () => {
    if (typeof window === "undefined") return { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };
    try {
      const saved = localStorage.getItem(SIZE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number }>(getInitialSize);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Save messages to localStorage (keep last 7 messages = ~3 exchanges)
  useEffect(() => {
    try {
      const toSave = messages.slice(-7);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages, STORAGE_KEY]);

  // Save size to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(size));
    } catch {}
  }, [size, SIZE_KEY]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Resize logic - drag top-left corner
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = resizeStart.current.x - ev.clientX;
        const dy = resizeStart.current.y - ev.clientY;
        setSize({
          w: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStart.current.w + dx)),
          h: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStart.current.h + dy)),
        });
      };

      const onMouseUp = () => {
        isResizing.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [size]
  );

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, noteContext, noteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          sources: data.ragSources || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an issue connecting to the AI. Please try again! 🙏" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        "<code style='background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:12px;font-family:monospace'>$1</code>"
      )
      .replace(/\n/g, "<br/>");

  const clearHistory = () => {
    const welcome: Message = {
      role: "assistant",
      content: `Hi! 👋 I'm your **RAG-Powered AI Tutor** for **"${noteContext.title}"**. Ask me anything!`,
    };
    setMessages([welcome]);
  };

  return (
    <>
      {/* Floating Button with RAG Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-full shadow-2xl transition-all hover:scale-105 font-semibold text-sm sm:text-base border border-white/20"
        >
          <div className="p-1 bg-white/20 rounded-full">
            <MessageCircle className="h-4 w-4" />
          </div>
          Ask AI Tutor
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-white/20 text-white">
            RAG
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden select-none"
          style={{ width: size.w, height: size.h }}
        >
          {/* Resize Handle (top-left corner) */}
          <div
            onMouseDown={startResize}
            className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
            title="Drag to resize chat window"
          >
            <GripVertical className="h-3 w-3 text-white rotate-90" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0 text-white">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 rounded-full p-1.5">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm">AI Tutor</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/25 text-white tracking-wide">
                    RAG Grounded
                  </span>
                </div>
                <p className="text-xs text-blue-100 truncate max-w-[190px]">{noteContext.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                title="Clear chat history"
                className="text-xs text-blue-200 hover:text-white px-2 py-1 rounded hover:bg-white/20 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* History Notice */}
          {messages.length > 1 && (
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-1 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 flex items-center justify-center gap-1">
              <Database className="h-3 w-3 text-indigo-400" />
              Vector-Indexed Context & History Saved
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div className="max-w-[82%] space-y-1.5">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-xs"
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />

                  {/* RAG Citation Sources Badge */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pl-1">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Grounded in {msg.sources.length} document chunk(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-indigo-500 animate-spin" />
                      Searching vectors & generating...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
              <p className="text-xs text-slate-400 mb-1.5">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Summarize key formulas/points",
                  "Explain this with a real example",
                  "What questions might come in exams?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (searches vector embeddings)..."
              disabled={loading}
              className="flex-1 text-sm px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 disabled:opacity-50 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-xs"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
