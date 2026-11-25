"use client";

import { useState } from "react";
import {
  Issue,
  IssuePriority,
  IssueStatus,
  IssueUpdate,
  triageIssue,
  TriageResult,
} from "@/lib/api";
import { PRIORITY_LABEL, PriorityIcon, STATUS_LABEL, StatusIcon } from "@/components/Icons";

interface IssueCardProps {
  issue: Issue;
  onUpdate: (id: number, payload: IssueUpdate) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const PRIORITIES: (IssuePriority | null)[] = [null, "low", "medium", "high", "urgent"];
const STATUSES: IssueStatus[] = ["open", "in_progress", "done"];

const LABEL_COLORS = [
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "bg-purple-500/15 text-purple-300 border-purple-500/30",
];

function getLabelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export function IssueCard({ issue, onUpdate, onDelete }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [openMenu, setOpenMenu] = useState<"priority" | "status" | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  async function handleTriage() {
    setExpanded(true);
    setTriaging(true);
    setTriageError(null);
    try {
      const result = await triageIssue(issue.id);
      setTriageResult(result);
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : "AI triage failed");
    } finally {
      setTriaging(false);
    }
  }

  async function handleApplyTriage() {
    if (!triageResult) return;
    const mergedLabels = Array.from(
      new Set([...issue.labels, ...triageResult.suggested_labels]),
    );
    await onUpdate(issue.id, {
      priority: triageResult.suggested_priority,
      labels: mergedLabels,
    });
    setTriageResult(null);
  }

  return (
    <article className="group relative border-b border-zinc-800/80 last:border-b-0 hover:bg-zinc-900/70 transition-colors">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Priority Symbol Popover */}
        <div className="relative">
          <button
            type="button"
            title={`Priority: ${PRIORITY_LABEL[issue.priority ?? ""]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent hover:border-zinc-700 hover:bg-zinc-800 transition"
          >
            <PriorityIcon priority={issue.priority} />
          </button>

          {openMenu === "priority" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
              {PRIORITIES.map((p) => (
                <button
                  key={p ?? "none"}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { priority: p });
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                    issue.priority === p
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-800/70"
                  }`}
                >
                  <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                  <span>{PRIORITY_LABEL[p ?? ""]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Issue ID */}
        <span className="w-10 shrink-0 font-mono text-xs text-zinc-500">
          ISS-{issue.id}
        </span>

        {/* Status Symbol Popover */}
        <div className="relative">
          <button
            type="button"
            title={`Status: ${STATUS_LABEL[issue.status]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent hover:border-zinc-700 hover:bg-zinc-800 transition"
          >
            <StatusIcon status={issue.status} />
          </button>

          {openMenu === "status" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { status: s });
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                    issue.status === s
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-800/70"
                  }`}
                >
                  <StatusIcon status={s} className="h-3.5 w-3.5" />
                  <span>{STATUS_LABEL[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title (click to expand description) */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block truncate text-sm font-medium ${
              issue.status === "done"
                ? "text-zinc-500 line-through"
                : "text-zinc-100 group-hover:text-white"
            }`}
          >
            {issue.title}
          </span>
        </button>

        {/* Labels */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getLabelColor(label)}`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* AI Triage button */}
        <button
          type="button"
          title="Run Gemini AI triage"
          onClick={handleTriage}
          disabled={triaging}
          className="flex shrink-0 items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-300 transition hover:border-indigo-400/60 hover:bg-indigo-500/20 disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
            <path
              d="M8 1.75L9.55 6.45L14.25 8L9.55 9.55L8 14.25L6.45 9.55L1.75 8L6.45 6.45L8 1.75Z"
              fill="currentColor"
            />
          </svg>
          <span>{triaging ? "Triaging..." : "Triage"}</span>
        </button>

        {/* Date */}
        <span className="hidden shrink-0 text-xs text-zinc-500 md:inline">
          {new Date(issue.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>

        {/* Delete button */}
        <button
          type="button"
          title="Delete issue"
          onClick={() => onDelete(issue.id)}
          className="rounded-md p-1.5 text-zinc-500 opacity-60 transition hover:bg-rose-950/70 hover:text-rose-400 group-hover:opacity-100"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path
              d="M3 4.5H13M6 4.5V3.2C6 2.81 6.31 2.5 6.7 2.5H9.3C9.69 2.5 10 2.81 10 3.2V4.5M4.5 4.5L5.1 12.6C5.15 13.11 5.58 13.5 6.09 13.5H9.91C10.42 13.5 10.85 13.11 10.9 12.6L11.5 4.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Expandable description + AI Triage suggestion drawer */}
      {expanded && (
        <div className="space-y-3 border-t border-zinc-800/60 bg-zinc-950/50 px-14 py-3 text-sm text-zinc-400">
          <p className="whitespace-pre-wrap leading-relaxed">{issue.description}</p>

          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:hidden">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getLabelColor(label)}`}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {triageError && (
            <p className="rounded-lg border border-rose-800/70 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {triageError}
            </p>
          )}

          {triageResult && (
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/25 p-3.5 text-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-indigo-300">
                  Gemini Triage Suggestion
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTriage}
                    className="rounded-md bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-500"
                  >
                    Apply Suggestions
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageResult(null)}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-zinc-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <p className="text-zinc-200">{triageResult.one_line_summary}</p>
              <p className="mt-1 text-zinc-400">{triageResult.reasoning}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-200">
                  <PriorityIcon priority={triageResult.suggested_priority} className="h-3.5 w-3.5" />
                  {PRIORITY_LABEL[triageResult.suggested_priority]}
                </span>
                {triageResult.suggested_labels.map((label) => (
                  <span
                    key={label}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getLabelColor(label)}`}
                  >
                    +{label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
