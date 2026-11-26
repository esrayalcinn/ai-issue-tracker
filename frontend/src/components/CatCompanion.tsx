"use client";

import { FormEvent, useEffect, useState } from "react";
import { chatWithAssistant, Issue } from "@/lib/api";
import { getUpcomingReminders } from "@/lib/deadlines";
import { CatMascot, CatMood } from "@/components/CatMascot";

interface CatCompanionProps {
  openIssues: Issue[];
  celebrating?: boolean;
  onNewIssue: () => void;
  onOpenFullChat?: () => void;
  onBoardMutated: () => Promise<void>;
  inline?: boolean;
}

const PET_REPLIES = [
  "Purrrr~ Maviş loves head pats!",
  "Mrrp! Feeling extra fluffy now.",
  "Hehe, more chin scratches please~",
  "Purr... you're doing great today!",
];

export function CatCompanion({
  openIssues,
  celebrating = false,
  onNewIssue,
  onOpenFullChat,
  onBoardMutated,
  inline = false,
}: CatCompanionProps) {
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [petted, setPetted] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [reply, setReply] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Refresh deadline countdowns every 60 seconds
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const openCount = openIssues.length;
  const urgentCount = openIssues.filter((i) => i.priority === "urgent").length;
  const reminders = getUpcomingReminders(openIssues, nowMs);
  const topReminder = reminders[0] ?? null;

  // Maviş automatically wakes up if a deadline is overdue or <= 1 hour away!
  const hasImmediateDeadline =
    topReminder !== null &&
    (topReminder.info.urgency === "overdue" || topReminder.info.urgency === "hour");

  const activeMood: CatMood =
    petted || celebrating
      ? "happy"
      : bubbleOpen || hasImmediateDeadline
        ? urgentCount > 0 || hasImmediateDeadline
          ? "urgent"
          : "idle"
        : "sleeping";

  function triggerHappy(message: string) {
    setPetted(true);
    setReply(message);
    setTimeout(() => setPetted(false), 3200);
  }

  function handlePet() {
    const line = PET_REPLIES[petCount % PET_REPLIES.length];
    setPetCount((n) => n + 1);
    triggerHappy(line);
  }

  async function askCat(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || thinking) return;

    setThinking(true);
    setReply(null);
    setInput("");
    try {
      const res = await chatWithAssistant(trimmed, []);
      if (res.mutated) {
        await onBoardMutated();
        triggerHappy(res.reply);
      } else {
        setReply(res.reply);
      }
    } catch (err) {
      setReply(err instanceof Error ? err.message : "Oops, couldn't reach assistant.");
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    askCat(input);
  }

  let defaultGreeting: string;
  if (celebrating) {
    defaultGreeting = "Nice job finishing that! Maviş is proud of you~";
  } else if (topReminder) {
    const extra = reminders.length > 1 ? ` (+${reminders.length - 1} more this week)` : "";
    defaultGreeting = `Meow! Reminder: "${topReminder.issue.title}" is ${topReminder.info.label}${extra}.`;
  } else if (openCount === 0) {
    defaultGreeting = "All clear! Maviş is ready for a nap—or want to add something?";
  } else if (urgentCount > 0) {
    defaultGreeting = `You have ${openCount} open (${urgentCount} urgent). What should we do?`;
  } else {
    defaultGreeting = `Hi! You have ${openCount} open ${openCount === 1 ? "item" : "items"}. What would you like to do?`;
  }

  const shortTitle = topReminder
    ? topReminder.issue.title.length > 18
      ? `${topReminder.issue.title.slice(0, 18)}…`
      : topReminder.issue.title
    : "";

  let hintPill: string | null = null;
  let hintPillClass =
    "border-[#E5DDD2] bg-[#FFFDF9] text-[#6B615A] hover:border-[#D9A791]";

  if (celebrating) {
    hintPill = "Nice job!";
    hintPillClass = "border-[#CDE0D5] bg-[#E8F1EC] text-[#3B664F]";
  } else if (!bubbleOpen) {
    if (hasImmediateDeadline && topReminder) {
      hintPill = `Maviş: "${shortTitle}" ${topReminder.info.label}!`;
      hintPillClass = "border-[#EFCFD6] bg-[#FAE7EB] text-[#9E4555]";
    } else if (topReminder && topReminder.info.urgency === "soon") {
      hintPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
      hintPillClass = "border-[#EFE0B4] bg-[#FCF3D9] text-[#8A671F]";
    } else if (topReminder && topReminder.info.urgency === "week") {
      hintPill = `zzZ · due ${topReminder.info.label}`;
      hintPillClass = "border-[#C9DFEB] bg-[#E5F0F6] text-[#3E6B80]";
    } else if (urgentCount > 0) {
      hintPill = `zzZ · ${urgentCount} urgent`;
    } else {
      hintPill = "zzZ";
    }
  }

  const speechBubble = bubbleOpen && (
    <div
      className={`${
        inline ? "relative mb-2 w-full" : "mb-2 w-80 sm:w-88"
      } animate-cat-float rounded-2xl border border-[#E2D8CB] bg-[#FFFDF9] p-4 shadow-lg shadow-[#2B2623]/10`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <span className="mb-0.5 block font-display text-xs font-semibold text-[#8C6D53]">
            Maviş
          </span>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2B2623]">
            {thinking ? "Maviş is checking your notebook..." : (reply ?? defaultGreeting)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBubbleOpen(false)}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-[#9C9186] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
        >
          ×
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setBubbleOpen(false);
            onNewIssue();
          }}
          className="rounded-xl border border-[#F0D3C2] bg-[#FBEBE2] px-2.5 py-1.5 text-[11px] font-medium text-[#8C452D] transition hover:bg-[#F7DFD1]"
        >
          + New task
        </button>

        <button
          type="button"
          disabled={thinking}
          onClick={() => askCat("What deadlines or urgent items do I have coming up?")}
          className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50"
        >
          Deadlines?
        </button>

        <button
          type="button"
          disabled={thinking}
          onClick={() => askCat("Give me a short friendly summary of my open tasks.")}
          className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7] disabled:opacity-50"
        >
          Summarize
        </button>

        <button
          type="button"
          onClick={handlePet}
          className="rounded-xl border border-[#CDE0D5] bg-[#E8F1EC] px-2.5 py-1.5 text-[11px] font-medium text-[#3B664F] transition hover:bg-[#DAE9E0]"
        >
          Pet Maviş
        </button>

        {onOpenFullChat && (
          <button
            type="button"
            onClick={() => {
              setBubbleOpen(false);
              onOpenFullChat();
            }}
            className="rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-2.5 py-1.5 text-[11px] font-medium text-[#6B615A] transition hover:bg-[#F0E9DF]"
          >
            Full chat
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell Maviş: 'add OS hw due Friday'..."
          disabled={thinking}
          className="flex-1 rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-2.5 py-1.5 text-xs text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:bg-[#FFFDF9] focus:outline-none"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="rounded-xl bg-[#C96B4B] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-40"
        >
          Go
        </button>
      </form>

      <div
        className={`absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-[#E2D8CB] bg-[#FFFDF9] ${
          inline ? "left-1/2 -translate-x-1/2" : "right-16"
        }`}
      />
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col items-center">
        {speechBubble}
        <div className="relative flex flex-col items-center">
          {hintPill && (
            <span
              className={`mb-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-2xs ${hintPillClass}`}
            >
              {hintPill}
            </span>
          )}
          <CatMascot
            mood={activeMood}
            size="lg"
            celebrating={celebrating}
            onClick={() => setBubbleOpen((prev) => !prev)}
            title={bubbleOpen ? "Let Maviş nap" : "Click to wake Maviş"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-5 z-20 flex flex-col items-end">
      {speechBubble}

      <div className="relative flex flex-col items-center">
        {hintPill && (
          <button
            type="button"
            onClick={() => setBubbleOpen(true)}
            className={`mb-0.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-xs transition ${hintPillClass}`}
          >
            {hintPill}
          </button>
        )}
        <CatMascot
          mood={activeMood}
          size="xl"
          celebrating={celebrating}
          onClick={() => setBubbleOpen((prev) => !prev)}
          title={bubbleOpen ? "Let Maviş nap" : "Click to wake Maviş"}
        />
      </div>
    </div>
  );
}
