"use client";

import { FormEvent, useState } from "react";
import { ChatMessage, chatWithAssistant } from "@/lib/api";

interface AssistantDrawerProps {
  onClose: () => void;
  onBoardMutated: () => Promise<void>;
}

const STARTER_PROMPTS = [
  "What's urgent or high priority right now?",
  "Give me a quick summary of my open items",
  "Add a task: review OS lecture slides (priority medium, label study)",
];

export function AssistantDrawer({
  onClose,
  onBoardMutated,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    const history: ChatMessage[] = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await chatWithAssistant(trimmed, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
      if (res.mutated) {
        await onBoardMutated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant request failed");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-[#E5DDD2] bg-[#FFFDF9] shadow-xl shadow-[#2B2623]/10">
      <div className="flex items-center justify-between border-b border-[#ECE5DC] px-5 py-4">
        <div>
          <h2 className="font-display text-base font-medium text-[#2B2623]">
            Notebook Assistant
          </h2>
          <p className="text-[11px] text-[#8C8177]">
            Reads &amp; updates your real Postgres tasks via tool calling
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2.5 py-1 text-xs text-[#8C8177] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="space-y-2.5 pt-2">
            <p className="text-xs text-[#786F68]">Try asking:</p>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="block w-full rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-3.5 py-2.5 text-left text-xs text-[#4A423C] transition hover:border-[#D9A791] hover:bg-[#FBEBE2]/50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#C96B4B] text-white"
                  : "border border-[#ECE5DC] bg-[#FAF7F2] text-[#2B2623]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <p className="text-xs text-[#9C9186]">Thinking &amp; checking notebook...</p>
        )}

        {error && (
          <p className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-3.5 py-2 text-xs text-[#9E4555]">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[#ECE5DC] bg-[#FAF7F2] p-3.5"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tasks or add one..."
            disabled={sending}
            className="flex-1 rounded-xl border border-[#E5DDD2] bg-[#FFFDF9] px-3 py-2 text-xs text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-xl bg-[#C96B4B] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
