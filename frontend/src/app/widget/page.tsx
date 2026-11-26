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
import { ThemeToggle } from "@/components/ThemeToggle";

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const desktopMode = Boolean(window.desktopPet) || params.get("desktop") === "1";
    setIsDesktopPet(desktopMode);

    if (desktopMode) {
      document.title = "";
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
    "rounded-full border border-[var(--border-main)] bg-[var(--bg-surface)]/95 px-2.5 py-0.5 text-[var(--text-faint)] shadow-xs";
  if (hasImmediateDeadline && topReminder) {
    restingPill = `Maviş: "${shortTitle}" ${topReminder.info.label}!`;
    restingClass =
      "rounded-full border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-0.5 text-[#9E4555] shadow-xs dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0]";
  } else if (topReminder && topReminder.info.urgency === "soon") {
    restingPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
    restingClass =
      "rounded-full border border-[#EFE0B4] bg-[#FCF3D9] px-2.5 py-0.5 text-[#8A671F] shadow-xs dark:border-[#5C4B24] dark:bg-[#382F1B] dark:text-[#E8C97A]";
  } else if (topReminder && topReminder.info.urgency === "week") {
    restingPill = `zzZ · "${shortTitle}" ${topReminder.info.label}`;
    restingClass =
      "rounded-full border border-[#C9DFEB] bg-[#E5F0F6] px-2.5 py-0.5 text-[#3E6B80] shadow-xs dark:border-[#2F4A59] dark:bg-[#1E2E37] dark:text-[#96C7DE]";
  } else if (urgentCount > 0) {
    restingPill = `zzZ · ${urgentCount} urgent`;
  }

  return (
    <main
      className={`flex min-h-screen flex-col justify-end overflow-hidden px-3 pb-3 pt-4 text-[var(--text-main)] ${
        isDesktopPet ? "items-end bg-transparent" : "items-center bg-[var(--bg-page)]"
      }`}
    >
      {awake && (
        <div
          onMouseEnter={() => setInteractive(true)}
          onMouseLeave={() => setInteractive(false)}
          className="animate-cat-float relative mb-3 w-full max-w-xs rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 shadow-xl"
        >
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div>
              <span className="mb-0.5 block font-display text-xs font-semibold text-[#A07A5B] dark:text-[#D8B292]">
                Maviş
              </span>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-main)]">
                {thinking ? "Maviş is checking your notebook..." : (reply ?? greeting)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={handleToggleCat}
                title="Back to sleep"
                className="rounded-md px-1.5 py-0.5 text-xs text-[var(--text-faint)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setView(view === "tasks" ? "menu" : "tasks")}
              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
                view === "tasks"
                  ? "border-[#C96B4B] bg-[#C96B4B] text-white"
                  : "border-[var(--border-main)] bg-[var(--bg-page)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
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
                  : "border-[#F0D3C2] bg-[#FBEBE2] text-[#8C452D] hover:bg-[#F7DFD1] dark:border-[#593A2E] dark:bg-[#38251E] dark:text-[#EBB098]"
              }`}
            >
              + Add
            </button>

            <button
              type="button"
              disabled={thinking}
              onClick={() => askCat("What deadlines or urgent items do I have coming up?")}
              className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#963F50] transition hover:bg-[#F5D8DF] disabled:opacity-50 dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0]"
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
              className="rounded-xl border border-[#CDE0D5] bg-[#E8F1EC] px-2.5 py-1.5 text-[11px] font-medium text-[#3B664F] transition hover:bg-[#DAE9E0] dark:border-[#304D3E] dark:bg-[#1F3128] dark:text-[#98CFB2]"
            >
              Pet
            </button>

            {isDesktopPet ? (
              <>
                <button
                  type="button"
                  onClick={() => window.desktopPet?.openBoard()}
                  className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7] dark:border-[#494066] dark:bg-[#2A253B] dark:text-[#CFC5F0]"
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
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)]"
                >
                  Hide
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1.5 text-[11px] font-medium text-[#554782] transition hover:bg-[#E7E0F7] dark:border-[#494066] dark:bg-[#2A253B] dark:text-[#CFC5F0]"
              >
                Board
              </Link>
            )}
          </div>

          {view === "tasks" && (
            <div className="mb-3 max-h-56 divide-y divide-[var(--border-soft)] overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)]">
              {issues.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-[var(--text-faint)]">
                  No open tasks!
                </p>
              ) : (
                issues.map((issue) => {
                  const isExpanded = expandedId === issue.id;
                  const dl = getDeadlineInfo(issue.due_at, nowMs);
                  return (
                    <div key={issue.id} className="transition hover:bg-[var(--bg-surface)]">
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
                            className={`block text-xs text-[var(--text-main)] ${
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
                        <div className="border-t border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {issue.description || "No extra notes."}
                          </p>
                          {issue.due_at && (
                            <p className="mt-1.5 font-mono text-[10px] text-[#A07A5B] dark:text-[#D8B292]">
                              Due: {new Date(issue.due_at).toLocaleString()}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-[var(--text-faint)]">
                              #{issue.id}
                            </span>
                            <span className="rounded-md border border-[var(--border-main)] bg-[var(--bg-page)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                              {PRIORITY_LABEL[issue.priority ?? ""]}
                            </span>
                            {issue.labels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-[#DCD4F0] bg-[#F2EFFA] px-2 py-0.5 text-[10px] text-[#5B4D8A] dark:border-[#494066] dark:bg-[#2A253B] dark:text-[#CFC5F0]"
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
              className="mb-3 space-y-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] p-2.5"
            >
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="New to-do..."
                autoFocus
                className="w-full bg-transparent text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={quickDue}
                  onChange={(e) => setQuickDue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] text-[var(--text-main)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="rounded-lg bg-[#C96B4B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#B55C3E] disabled:opacity-40 dark:bg-[#D47D60]"
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
              className="flex-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-2.5 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:border-[#D49A80] focus:bg-[var(--bg-surface)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={thinking || !askInput.trim()}
              className="rounded-xl bg-[#C96B4B] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-40 dark:bg-[#D47D60]"
            >
              Go
            </button>
          </form>

          <div
            className={`absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-[var(--border-main)] bg-[var(--bg-surface)] ${
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
        className="flex cursor-grab flex-col items-center active:cursor-grabbing"
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
