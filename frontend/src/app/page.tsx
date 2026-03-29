"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");
  const [messages, setMessages] = useState([
    {
      role: "assistant" as const,
      content: chatId
        ? "Welcome back! What's on your mind?"
        : "Welcome! Select a character to start chatting.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const apiUrl = chatId
      ? `/api/chat/${chatId}`
      : `/api/chat?chatId=${chatId}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [userMessage],
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      // For simplicity, read full response
      const data = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: data.message || "Here's what I think...",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Loading...",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {chatId ? "In Character Chat" : "Select a Character"}
        </h1>

        <div className="bg-slate-800 rounded-2xl p-4 mb-4 max-h-[60vh] overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block p-3 rounded-xl max-w-[80%] ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-700 text-slate-100"
                }`}
              >
                <span>{m.content}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left text-slate-400 text-sm italic">
              Thinking...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
