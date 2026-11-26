"use client";

import { FormEvent, useState } from "react";
import { chatWithAssistant } from "@/lib/api";
import { CatMascot, CatMood } from "@/components/CatMascot";

interface CatCompanionProps {
  openCount: number;
  urgentCount: number;
  celebrating?: boolean;
  onNewIssue: () => void;
  onOpenFullChat?: () => void;
  onBoardMutated: () => Promise<void>;
  inline?: boolean;
}

const PET_REPLIES = [
  "Purrrr~ thank you for the head pats!",
  "Mrrp! Feeling extra fluffy now.",
  "Hehe, more chin scratches please~",
  "Purr... you're doing great today!",
];

export function CatCompanion({
  openCount,
  urgentCount,
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

  // Sleeps peacefully until clicked awake (or celebrating a completed task)
  const activeMood: CatMood =
    petted || celebrating
      ? "happy"
      : bubbleOpen
        ? urgentCount > 0
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

  const defaultGreeting = celebrating
    ? "Nice job finishing that! Want to check what's next?"
    : openCount === 0
      ? "All clear! Time for a cozy nap—or want to add something?"
      : urgentCount > 0
        ? `You have ${openCount} open (${urgentCount} urgent!). What should we do?`
        : `You have ${openCount} open ${openCount === 1 ? "item" : "items"}. What would you like to do?`;

  const hintPill = celebrating
    ? "Nice job!"
    : !bubbleOpen && urgentCount > 0
      ? `zzZ · ${urgentCount} urgent`
      : !bubbleOpen
        ? "zzZ"
        : null;

  const speechBubble = bubbleOpen && (
    <div
      className={`${
        inline ? "relative mb-2 w-full" : "mb-2 w-80 sm:w-88"
      } animate-cat-float rounded-2xl border border-[#E2D8CB] bg-[#FFFDF9] p-4 shadow-lg shadow-[#2B2623]/10`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2B2623]">
          {thinking ? "Checking your notebook..." : (reply ?? defaultGreeting)}
        </p>
        <button
          type="button"
          onClick={() => setBubbleOpen(false)}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-[#9C9186] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
        >
          ×
        </button>
      </div>

      {/* Quick Action Choices */}
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
          onClick={() => askCat("What are my most urgent or high priority open items?")}
          className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50"
        >
          What&apos;s urgent?
        </button>

        <button
          type="button"
          disabled={thinking}
          onClick={() => askCat("Give me a short friendly summary of my open tasks.")}
          className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7] disabled:opacity-50"
        >
          Summarize list
        </button>

        <button
          type="button"
          onClick={handlePet}
          className="rounded-xl border border-[#CDE0D5] bg-[#E8F1EC] px-2.5 py-1.5 text-[11px] font-medium text-[#3B664F] transition hover:bg-[#DAE9E0]"
        >
          Give head pats
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

      {/* Direct Mini Prompt Inside Speech Bubble */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me or say 'add task...' "
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

      {/* Speech Bubble Pointer Tail */}
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
            <span className="mb-1 rounded-full border border-[#E5DDD2] bg-[#FFFDF9] px-2.5 py-0.5 text-[11px] font-medium text-[#786F68] shadow-2xs">
              {hintPill}
            </span>
          )}
          <CatMascot
            mood={activeMood}
            size="lg"
            celebrating={celebrating}
            onClick={() => setBubbleOpen((prev) => !prev)}
            title={bubbleOpen ? "Click to let him nap" : "Click to wake him up"}
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
            className="mb-0.5 rounded-full border border-[#E5DDD2] bg-[#FFFDF9] px-2.5 py-0.5 text-[11px] font-medium text-[#6B615A] shadow-xs transition hover:border-[#D9A791] hover:text-[#2B2623]"
          >
            {hintPill}
          </button>
        )}
        <CatMascot
          mood={activeMood}
          size="xl"
          celebrating={celebrating}
          onClick={() => setBubbleOpen((prev) => !prev)}
          title={bubbleOpen ? "Click to let him nap" : "Click to wake him up"}
        />
      </div>
    </div>
  );
}
