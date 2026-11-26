"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  chatWithAssistant,
  createIssue,
  Issue,
  listIssues,
  updateIssue,
} from "@/lib/api";
import {
  fromDateTimeLocalValue,
  getDeadlineInfo,
  getUpcomingReminders,
} from "@/lib/deadlines";
import { CatMascot, CatMood } from "@/components/CatMascot";
import { PRIORITY_LABEL, PriorityIcon, StatusIcon } from "@/components/Icons";

type BubbleView = "menu" | "tasks" | "add";

declare global {
  interface Window {
    desktopPet?: {
      setIgnoreMouse: (ignore: boolean) => void;
      moveBy: (dx: number, dy: number) => void;
      hide: () => void;
      openBoard: () => void;
    };
  }
}

const PET_REPLIES = [
  "Purrrr~ Maviş loves head pats!",
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
  const [quickDue, setQuickDue] = useState("");
  const [askInput, setAskInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [happy, setHappy] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isDesktopPet, setIsDesktopPet] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    lastX: number;
    lastY: number;
  }>({ active: false, moved: false, lastX: 0, lastY: 0 });

  // Detect frameless transparent Electron desktop pet mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const desktopMode = Boolean(window.desktopPet) || params.get("desktop") === "1";
    setIsDesktopPet(desktopMode);

    if (desktopMode) {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
      window.desktopPet?.setIgnoreMouse(true);
    }

    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

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
    const poll = setInterval(() => {
      setNowMs(Date.now());
      loadOpenIssues();
    }, 60_000);
    return () => clearInterval(poll);
  }, [loadOpenIssues]);

  function setInteractive(active: boolean) {
    if (window.desktopPet) {
      window.desktopPet.setIgnoreMouse(!active);
    }
  }

  function triggerHappy(message: string) {
    setHappy(true);
    setReply(message);
    setTimeout(() => setHappy(false), 3000);
  }

  function handleToggleCat() {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    if (awake) {
      setAwake(false);
      setView("menu");
      setReply(null);
    } else {
      setAwake(true);
      loadOpenIssues();
    }
  }

  function handleCatMouseDown(e: ReactMouseEvent) {
    if (!window.desktopPet || e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      lastX: e.screenX,
      lastY: e.screenY,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = moveEvent.screenX - dragRef.current.lastX;
      const dy = moveEvent.screenY - dragRef.current.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        window.desktopPet?.moveBy(dx, dy);
        dragRef.current.lastX = moveEvent.screenX;
        dragRef.current.lastY = moveEvent.screenY;
      }
    };

    const onMouseUp = () => {
      dragRef.current.active = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    await createIssue({
      title: trimmed,
      description: "",
      due_at: fromDateTimeLocalValue(quickDue),
    });
    setQuickTitle("");
    setQuickDue("");
    setView("menu");
    await loadOpenIssues();
    triggerHappy(`Maviş saved "${trimmed}"!`);
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
  const reminders = getUpcomingReminders(issues, nowMs);
  const topReminder = reminders[0] ?? null;

  const hasImmediateDeadline =
    topReminder !== null &&
    (topReminder.info.urgency === "overdue" || topReminder.info.urgency === "hour");

  const mood: CatMood = happy
    ? "happy"
    : awake || hasImmediateDeadline
      ? "idle"
      : "sleeping";

  let greeting: string;
  if (topReminder) {
    const extra = reminders.length > 1 ? ` (+${reminders.length - 1} more this week)` : "";
    greeting = `Meow! "${topReminder.issue.title}" is ${topReminder.info.label}${extra}.`;
  } else if (issues.length === 0) {
    greeting = "All clear! Want to add a task or pet Maviş?";
  } else if (urgentCount > 0) {
    greeting = `You have ${issues.length} open (${urgentCount} urgent). What should we do?`;
  } else {
    greeting = `You have ${issues.length} open ${issues.length === 1 ? "task" : "tasks"}. What should we do?`;
  }

  const shortTitle = topReminder
    ? topReminder.issue.title.length > 18
      ? `${topReminder.issue.title.slice(0, 18)}…`
      : topReminder.issue.title
    : "";

  let restingPill = "zzZ";
  let restingClass =
    "rounded-full border border-[#E5DDD2] bg-[#FFFDF9]/95 px-2.5 py-0.5 text-[#8C8177] shadow-xs";
  if (hasImmediateDeadline && topReminder) {
    restingPill = `Maviş: "${shortTitle}" ${topReminder.info.label}!`;
    restingClass =
      "rounded-full border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-0.5 text-[#9E4555] shadow-xs";
  } else if (topReminder && topReminder.info.urgency === "soon") {
    restingPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
    restingClass =
      "rounded-full border border-[#EFE0B4] bg-[#FCF3D9] px-2.5 py-0.5 text-[#8A671F] shadow-xs";
  } else if (topReminder && topReminder.info.urgency === "week") {
    restingPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
    restingClass =
      "rounded-full border border-[#C9DFEB] bg-[#E5F0F6] px-2.5 py-0.5 text-[#3E6B80] shadow-xs";
  } else if (urgentCount > 0) {
    restingPill = `zzZ · ${urgentCount} urgent`;
  }

  return (
    <main
      className={`flex min-h-screen flex-col justify-end overflow-hidden px-3 pb-3 pt-4 text-[#2B2623] ${
        isDesktopPet ? "items-end bg-transparent" : "items-center bg-[#FAF7F2]"
      }`}
    >
      {awake && (
        <div
          onMouseEnter={() => setInteractive(true)}
          onMouseLeave={() => setInteractive(false)}
          className="animate-cat-float relative mb-3 w-full max-w-xs rounded-2xl border border-[#E2D8CB] bg-[#FFFDF9] p-4 shadow-xl shadow-[#2B2623]/15"
        >
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div>
              <span className="mb-0.5 block font-display text-xs font-semibold text-[#8C6D53]">
                Maviş
              </span>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2B2623]">
                {thinking ? "Maviş is checking your notebook..." : (reply ?? greeting)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCat}
              title="Back to sleep"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-[#9C9186] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
            >
              ×
            </button>
          </div>

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
              onClick={() => askCat("What deadlines or urgent items do I have coming up?")}
              className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50"
            >
              Deadlines?
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

            {isDesktopPet ? (
              <>
                <button
                  type="button"
                  onClick={() => window.desktopPet?.openBoard()}
                  className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7]"
                >
                  Board
                </button>
                <button
                  type="button"
                  title="Hide Maviş (press Ctrl+Shift+M to bring him back)"
                  onClick={() => {
                    setAwake(false);
                    window.desktopPet?.hide();
                  }}
                  className="rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-2.5 py-1.5 text-[11px] font-medium text-[#786F68] transition hover:bg-[#F0E9DF]"
                >
                  Hide
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7]"
              >
                Board
              </Link>
            )}
          </div>

          {view === "tasks" && (
            <div className="mb-3 max-h-56 divide-y divide-[#F0EAE2] overflow-y-auto rounded-xl border border-[#ECE5DC] bg-[#FAF7F2]">
              {issues.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-[#8C8177]">
                  No open tasks!
                </p>
              ) : (
                issues.map((issue) => {
                  const isExpanded = expandedId === issue.id;
                  const dl = getDeadlineInfo(issue.due_at, nowMs);
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
                        {dl && (
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium ${dl.badgeClass}`}
                          >
                            {dl.label}
                          </span>
                        )}
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
                          {issue.due_at && (
                            <p className="mt-1.5 font-mono text-[10px] text-[#8C6D53]">
                              Due: {new Date(issue.due_at).toLocaleString()}
                            </p>
                          )}
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

          {view === "add" && (
            <form
              onSubmit={handleQuickAdd}
              className="mb-3 space-y-2 rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] p-2.5"
            >
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="New to-do..."
                autoFocus
                className="w-full bg-transparent text-xs text-[#2B2623] placeholder-[#A89E94] focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={quickDue}
                  onChange={(e) => setQuickDue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#E5DDD2] bg-[#FFFDF9] px-2 py-1 text-[10px] text-[#2B2623] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="rounded-lg bg-[#C96B4B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#B55C3E] disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </form>
          )}

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
              placeholder="Tell Maviş: 'add hw due Friday'..."
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

          <div
            className={`absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-[#E2D8CB] bg-[#FFFDF9] ${
              isDesktopPet ? "right-16" : "left-1/2 -translate-x-1/2"
            }`}
          />
        </div>
      )}

      <div
        onMouseEnter={() => setInteractive(true)}
        onMouseLeave={() => {
          if (!dragRef.current.active) setInteractive(false);
        }}
        onMouseDown={handleCatMouseDown}
        className="flex flex-col items-center cursor-grab active:cursor-grabbing"
      >
        {!awake && (
          <button
            type="button"
            onClick={handleToggleCat}
            className={`mb-1 font-mono text-[11px] font-medium transition ${restingClass}`}
          >
            {restingPill}
          </button>
        )}
        <CatMascot
          mood={mood}
          size="xl"
          onClick={handleToggleCat}
          title={awake ? "Let Maviş nap" : "Click to wake Maviş"}
        />
      </div>
    </main>
  );
}
