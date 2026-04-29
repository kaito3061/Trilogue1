"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Message } from "@/types/chat";

const makeMessage = (role: Message["role"], content: string): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = makeMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const assistantMessage = makeMessage("assistant", "これはテストの返答です");
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6">
        <header className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
          <h1 className="text-lg font-semibold sm:text-xl">AI Chat Platform (MVP)</h1>
          <p className="mt-1 text-sm text-slate-400">
            ユーザーと単一AIの1対1会話を行う汎用チャットUI
          </p>
        </header>

        <div className="flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="h-[60vh] space-y-3 overflow-y-auto p-4 sm:p-5">
            {messages.length === 0 && (
              <p className="pt-8 text-center text-sm text-slate-500">
                メッセージを送信すると会話が始まります。
              </p>
            )}

            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <article
                  key={message.id}
                  className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                      <Bot className="h-4 w-4" />
                    </span>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "border border-slate-700 bg-slate-800/80 text-slate-100"
                    }`}
                  >
                    {message.content}
                  </div>

                  {isUser && (
                    <span className="rounded-full bg-blue-500/20 p-2 text-blue-200">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                </article>
              );
            })}

            {isLoading && (
              <article className="flex items-start gap-3">
                <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-300">
                  処理中...
                </div>
              </article>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="メッセージを入力..."
            disabled={isLoading}
            className="h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none transition focus:border-blue-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || input.trim().length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            <Send className="h-4 w-4" />
            送信
          </button>
        </form>
      </section>
    </main>
  );
}
