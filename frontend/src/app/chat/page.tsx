"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  text: "Hello! I'm your AI financial advisor powered by Gemini. Ask me anything about investing, your risk profile, or financial planning.",
  suggestions: [
    "What is my risk profile?",
    "Explain SIP investing",
    "How should I plan for retirement?",
    "How can I save tax?",
  ],
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ role: string; content: string }[]>("/api/v1/chat/history")
      .then((history) => {
        if (history && history.length > 0) {
          const loaded: Message[] = history.map((m) => ({
            role: m.role as "user" | "assistant",
            text: m.content,
          }));
          setMessages([WELCOME_MESSAGE, ...loaded]);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Try SSE streaming first
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text }),
        },
      );

      if (!res.ok || !res.body) {
        throw new Error("Streaming failed");
      }

      // Add empty assistant message to fill in token-by-token
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, text: last.text + data.token };
                  return updated;
                });
              }
              if (data.suggestions) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, suggestions: data.suggestions };
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      }
    } catch {
      // Fall back to non-streaming endpoint
      try {
        const res = await api<{ response: string; suggestions?: string[] }>("/api/v1/chat/message", {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });
        setMessages((prev) => {
          // If an empty assistant message was added by streaming attempt, replace it
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.text === "") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              text: res.response,
              suggestions: res.suggestions,
            };
            return updated;
          }
          return [
            ...prev,
            { role: "assistant", text: res.response, suggestions: res.suggestions },
          ];
        });
      } catch {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.text === "") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              text: "Sorry, I couldn't process that. Please try again.",
            };
            return updated;
          }
          return [
            ...prev,
            { role: "assistant", text: "Sorry, I couldn't process that. Please try again." },
          ];
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
          {!historyLoaded && (
            <div className="flex justify-center py-8">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          {historyLoaded && messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                }`}
              >
                {msg.text}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3" role="status" aria-label="Typing">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <div className="flex gap-2">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
              placeholder="Ask about investments, risk, or your portfolio..."
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
              disabled={loading}
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="rounded-full" aria-label="Send message">
              Send
            </Button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
            AI-powered by Gemini. Educational insights only — not financial advice.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
