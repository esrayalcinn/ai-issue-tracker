"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  chatWithAssistant,
  createIssue,
  Issue,
  listIssues,
  updateIssue,
} from "@/lib/api";
import { CatMascot, CatMood } from "@/components/CatMascot";
import { PRIORITY_LABEL, PriorityIcon, StatusIcon } from "@/components/Icons";

type BubbleView = "menu" | "tasks" | "add";

const PET_REPLIES = [
  "Purrrr~ thank you for the head pats!",
  "Mrrp! Feeling extra fluffy now.",
  "Hehe, more chin scratches please~",
  "Purr... you're doing great today!",
];

export default function WidgetPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [awake, setAwake] = useState(false);
  const [view, setView] = useState<BubbleView>("menu");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [askInput, setAskInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [happy, setHappy] = useState(false);
  const [petCount, setPetCount] = useState(0);

  const loadOpenIssues = useCallback(async () => {
    try {
      const all = await listIssues();
      setIssues(all.filter((i) => i.status !== "done"));
    } catch {
      // keep silent when offline until clicked
    }
  }, []);

  useEffect(() => {
    loadOpenIssues();
  }, [loadOpenIssues]);

  function triggerHappy(message: string) {
    setHappy(true);
    setReply(message);
    setTimeout(() => setHappy(false), 3000);
  }

  function handleToggleCat() {
    if (awake) {
      setAwake(false);
      setView("menu");
      setReply(null);
    } else {
      setAwake(true);
      loadOpenIssues();
    }
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    await createIssue({ title: trimmed, description: "" });
    setQuickTitle("");
    setView("menu");
    await loadOpenIssues();
    triggerHappy(`Saved "${trimmed}"!`);
  }

  async function handleMarkDone(id: number) {
    await updateIssue(id, { status: "done" });
    setIssues((prev) => prev.filter((i) => i.id !== id));
    triggerHappy("Nice job finishing that!");
  }

  async function askCat(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || thinking) return;
    setThinking(true);
    setView("menu");
    setReply(null);
    setAskInput("");
    try {
      const res = await chatWithAssistant(trimmed, []);
      if (res.mutated) {
        await loadOpenIssues();
        triggerHappy(res.reply);
      } else {
        setReply(res.reply);
      }
    } catch (err) {
      setReply(err instanceof Error ? err.message : "Couldn't reach assistant.");
    } finally {
      setThinking(false);
    }
  }

  const urgentCount = issues.filter((i) => i.priority === "urgent").length;
  const mood: CatMood = happy ? "happy" : awake ? "idle" : "sleeping";

  const greeting =
    issues.length === 0
      ? "All clear! Want to add a task or give head pats?"
      : urgentCount > 0
        ? `You have ${issues.length} open (${urgentCount} urgent). What should we do?`
        : `You have ${issues.length} open ${issues.length === 1 ? "task" : "tasks"}. What should we do?`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-end bg-[#FAF7F2] px-4 pb-8 pt-6 text-[#2B2623]">
      {/* Speech Bubble — only visible after clicking the cat */}
      {awake && (
        <div className="animate-cat-float relative mb-3 w-full max-w-xs rounded-2xl border border-[#E2D8CB] bg-[#FFFDF9] p-4 shadow-lg shadow-[#2B2623]/10">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2B2623]">
              {thinking ? "Checking your notebook..." : (reply ?? greeting)}
            </p>
            <button
              type="button"
              onClick={handleToggleCat}
              title="Back to sleep"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-[#9C9186] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
            >
              ×
            </button>
          </div>

          {/* Action Picker */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setView(view === "tasks" ? "menu" : "tasks")}
              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
                view === "tasks"
                  ? "border-[#C96B4B] bg-[#C96B4B] text-white"
                  : "border-[#E5DDD2] bg-[#FAF7F2] text-[#4A423C] hover:bg-[#F0E9DF]"
              }`}
            >
              Tasks ({issues.length})
            </button>

            <button
              type="button"
              onClick={() => setView(view === "add" ? "menu" : "add")}
              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
                view === "add"
                  ? "border-[#C96B4B] bg-[#C96B4B] text-white"
                  : "border-[#F0D3C2] bg-[#FBEBE2] text-[#8C452D] hover:bg-[#F7DFD1]"
              }`}
            >
              + Add
            </button>

            <button
              type="button"
              disabled={thinking}
              onClick={() => askCat("What are my most urgent or high priority open items?")}
              className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50"
            >
              Urgent?
            </button>

            <button
              type="button"
              onClick={() => {
                const line = PET_REPLIES[petCount % PET_REPLIES.length];
                setPetCount((n) => n + 1);
                triggerHappy(line);
              }}
              className="rounded-xl border border-[#CDE0D5] bg-[#E8F1EC] px-2.5 py-1.5 text-[11px] font-medium text-[#3B664F] transition hover:bg-[#DAE9E0]"
            >
              Pet
            </button>

            <Link
              href="/"
              className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7]"
            >
              Board
            </Link>
          </div>

          {/* Inline Task List inside Speech Bubble */}
          {view === "tasks" && (
            <div className="mb-3 max-h-60 divide-y divide-[#F0EAE2] overflow-y-auto rounded-xl border border-[#ECE5DC] bg-[#FAF7F2]">
              {issues.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-[#8C8177]">
                  No open tasks!
                </p>
              ) : (
                issues.map((issue) => {
                  const isExpanded = expandedId === issue.id;
                  return (
                    <div key={issue.id} className="transition hover:bg-[#FFFDF9]">
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <button
                          type="button"
                          title="Mark done"
                          onClick={() => handleMarkDone(issue.id)}
                          className="shrink-0 transition hover:scale-110"
                        >
                          <StatusIcon status={issue.status} className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : issue.id)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <span
                            className={`block text-xs text-[#2B2623] ${
                              isExpanded ? "font-medium whitespace-normal" : "truncate"
                            }`}
                          >
                            {issue.title}
                          </span>
                        </button>
                        <PriorityIcon
                          priority={issue.priority}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                      </div>

                      {isExpanded && (
                        <div className="border-t border-[#F0EAE2] bg-[#FFFDF9] px-3 py-2 text-[11px] text-[#5E554E]">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {issue.description || "No extra notes."}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-[#9C9186]">
                              #{issue.id}
                            </span>
                            <span className="rounded-md border border-[#E5DDD2] bg-[#FAF7F2] px-1.5 py-0.5 text-[10px] text-[#6B615A]">
                              {PRIORITY_LABEL[issue.priority ?? ""]}
                            </span>
                            {issue.labels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-[#DCD4F0] bg-[#F2EFFA] px-2 py-0.5 text-[10px] text-[#5B4D8A]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Inline Quick-Add inside Speech Bubble */}
          {view === "add" && (
            <form
              onSubmit={handleQuickAdd}
              className="mb-3 flex items-center gap-1.5 rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-2.5 py-1.5"
            >
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="New to-do..."
                autoFocus
                className="flex-1 bg-transparent text-xs text-[#2B2623] placeholder-[#A89E94] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="rounded-lg bg-[#C96B4B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#B55C3E] disabled:opacity-40"
              >
                Save
              </button>
            </form>
          )}

          {/* Mini Ask Assistant Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askCat(askInput);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              placeholder="Ask me or say 'add task...'"
              disabled={thinking}
              className="flex-1 rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-2.5 py-1.5 text-xs text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:bg-[#FFFDF9] focus:outline-none"
            />
            <button
              type="submit"
              disabled={thinking || !askInput.trim()}
              className="rounded-xl bg-[#C96B4B] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-40"
            >
              Go
            </button>
          </form>

          {/* Speech Bubble Tail */}
          <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-[#E2D8CB] bg-[#FFFDF9]" />
        </div>
      )}

      {/* Just the Big Cat — no card, no borders */}
      <div className="flex flex-col items-center">
        {!awake && (
          <span className="mb-1 font-mono text-xs text-[#A3988D]">
            {urgentCount > 0 ? `zzZ · ${urgentCount} urgent` : "zzZ"}
          </span>
        )}
        <CatMascot
          mood={mood}
          size="xl"
          onClick={handleToggleCat}
          title={awake ? "Click to let him nap" : "Click to wake him up"}
        />
      </div>
    </main>
  );
}
