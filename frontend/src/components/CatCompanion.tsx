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

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const openCount = openIssues.length;
  const urgentCount = openIssues.filter((i) => i.priority === "urgent").length;
  const reminders = getUpcomingReminders(openIssues, nowMs);
  const topReminder = reminders[0] ?? null;

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
    "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[#D9A791]";

  if (celebrating) {
    hintPill = "Nice job!";
    hintPillClass =
      "border-[#CDE0D5] bg-[#E8F1EC] text-[#3B664F] dark:border-[#304D3E] dark:bg-[#1F3128] dark:text-[#98CFB2]";
  } else if (!bubbleOpen) {
    if (hasImmediateDeadline && topReminder) {
      hintPill = `Maviş: "${shortTitle}" ${topReminder.info.label}!`;
      hintPillClass =
        "border-[#EFCFD6] bg-[#FAE7EB] text-[#9E4555] dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0]";
    } else if (topReminder && topReminder.info.urgency === "soon") {
      hintPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
      hintPillClass =
        "border-[#EFE0B4] bg-[#FCF3D9] text-[#8A671F] dark:border-[#5C4B24] dark:bg-[#382F1B] dark:text-[#E8C97A]";
    } else if (topReminder && topReminder.info.urgency === "week") {
      hintPill = `zzZ · due ${topReminder.info.label}`;
      hintPillClass =
        "border-[#C9DFEB] bg-[#E5F0F6] text-[#3E6B80] dark:border-[#2F4A59] dark:bg-[#1E2E37] dark:text-[#96C7DE]";
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
      } animate-cat-float rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 shadow-lg`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <span className="mb-0.5 block font-display text-xs font-semibold text-[#A07A5B] dark:text-[#D8B292]">
            Maviş
          </span>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-main)]">
            {thinking ? "Maviş is checking your notebook..." : (reply ?? defaultGreeting)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBubbleOpen(false)}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--text-faint)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"
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
          className="rounded-xl border border-[#F0D3C2] bg-[#FBEBE2] px-2.5 py-1.5 text-[11px] font-medium text-[#8C452D] transition hover:bg-[#F7DFD1] dark:border-[#593A2E] dark:bg-[#38251E] dark:text-[#EBB098] dark:hover:bg-[#472F26]"
        >
          + New task
        </button>

        <button
          type="button"
          disabled={thinking}
          onClick={() => askCat("What deadlines or urgent items do I have coming up?")}
          className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50 dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0] dark:hover:bg-[#4A2A31]"
        >
          Deadlines?
        </button>

        <button
          type="button"
          disabled={thinking}
          onClick={() => askCat("Give me a short friendly summary of my open tasks.")}
          className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7] disabled:opacity-50 dark:border-[#494066] dark:bg-[#2A253B] dark:text-[#CFC5F0] dark:hover:bg-[#352E4A]"
        >
          Summarize
        </button>

        <button
          type="button"
          onClick={handlePet}
          className="rounded-xl border border-[#CDE0D5] bg-[#E8F1EC] px-2.5 py-1.5 text-[11px] font-medium text-[#3B664F] transition hover:bg-[#DAE9E0] dark:border-[#304D3E] dark:bg-[#1F3128] dark:text-[#98CFB2] dark:hover:bg-[#294034]"
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
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)]"
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
          className="flex-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-2.5 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:border-[#D49A80] focus:bg-[var(--bg-surface)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="rounded-xl bg-[#C96B4B] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-40 dark:bg-[#D47D60] dark:hover:bg-[#C46C4F]"
        >
          Go
        </button>
      </form>

      <div
        className={`absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-[var(--border-main)] bg-[var(--bg-surface)] ${
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
