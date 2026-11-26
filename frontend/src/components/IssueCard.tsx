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
import {
  fromDateTimeLocalValue,
  getDeadlineInfo,
  toDateTimeLocalValue,
} from "@/lib/deadlines";
import { PRIORITY_LABEL, PriorityIcon, STATUS_LABEL, StatusIcon } from "@/components/Icons";

interface IssueCardProps {
  issue: Issue;
  onUpdate: (id: number, payload: IssueUpdate) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const PRIORITIES: (IssuePriority | null)[] = [null, "low", "medium", "high", "urgent"];
const STATUSES: IssueStatus[] = ["open", "in_progress", "done"];

const PASTEL_LABELS = [
  "bg-[#E8F1EC] text-[#3F6B54] border-[#CDE0D5] dark:bg-[#1F3128] dark:text-[#98CFB2] dark:border-[#304D3E]",
  "bg-[#FBEBE2] text-[#9E5238] border-[#F0D3C2] dark:bg-[#38251E] dark:text-[#EBB098] dark:border-[#593A2E]",
  "bg-[#EEEAF8] text-[#5B4D8A] border-[#DCD4F0] dark:bg-[#2A253B] dark:text-[#CFC5F0] dark:border-[#494066]",
  "bg-[#FCF3D9] text-[#8A671F] border-[#EFE0B4] dark:bg-[#382F1B] dark:text-[#E8C97A] dark:border-[#5C4B24]",
  "bg-[#E5F0F6] text-[#3E6B80] border-[#C9DFEB] dark:bg-[#1E2E37] dark:text-[#96C7DE] dark:border-[#2F4A59]",
  "bg-[#FAE7EB] text-[#9E4555] border-[#EFCFD6] dark:bg-[#3A2126] dark:text-[#F0A3B0] dark:border-[#63363F]",
];

function getLabelStyle(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_LABELS[Math.abs(hash) % PASTEL_LABELS.length];
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
      setTriageError(err instanceof Error ? err.message : "Could not run triage");
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

  const deadline = issue.status !== "done" ? getDeadlineInfo(issue.due_at) : null;

  return (
    <article className="group relative border-b border-[var(--border-soft)] last:border-b-0 transition-colors hover:bg-[var(--bg-hover)]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="relative">
          <button
            type="button"
            title={`Priority: ${PRIORITY_LABEL[issue.priority ?? ""]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition hover:border-[var(--border-main)] hover:bg-[var(--bg-subtle)]"
          >
            <PriorityIcon priority={issue.priority} />
          </button>

          {openMenu === "priority" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-1.5 shadow-md">
              {PRIORITIES.map((p) => (
                <button
                  key={p ?? "none"}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { priority: p });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                    issue.priority === p
                      ? "bg-[var(--bg-subtle)] font-medium text-[var(--text-main)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                  <span>{PRIORITY_LABEL[p ?? ""]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="w-12 shrink-0 font-mono text-xs text-[var(--text-faint)]">
          #{issue.id}
        </span>

        <div className="relative">
          <button
            type="button"
            title={`Status: ${STATUS_LABEL[issue.status]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition hover:border-[var(--border-main)] hover:bg-[var(--bg-subtle)]"
          >
            <StatusIcon status={issue.status} />
          </button>

          {openMenu === "status" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-1.5 shadow-md">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { status: s });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                    issue.status === s
                      ? "bg-[var(--bg-subtle)] font-medium text-[var(--text-main)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <StatusIcon status={s} className="h-3.5 w-3.5" />
                  <span>{STATUS_LABEL[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block truncate text-[14px] font-medium ${
              issue.status === "done"
                ? "text-[var(--text-faint)] line-through"
                : "text-[var(--text-main)]"
            }`}
          >
            {issue.title}
          </span>
        </button>

        <div className="hidden items-center gap-1.5 sm:flex">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getLabelStyle(label)}`}
            >
              {label}
            </span>
          ))}
        </div>

        {deadline && (
          <span
            title={issue.due_at ? `Due: ${new Date(issue.due_at).toLocaleString()}` : undefined}
            className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${deadline.badgeClass}`}
          >
            {deadline.label}
          </span>
        )}

        <button
          type="button"
          onClick={handleTriage}
          disabled={triaging}
          className="shrink-0 rounded-lg border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1 text-[11px] font-medium text-[#5B4D8A] transition hover:border-[#C5B8E6] hover:bg-[#E9E3F7] disabled:opacity-50 dark:border-[#494066] dark:bg-[#2A253B] dark:text-[#CFC5F0] dark:hover:bg-[#332D47]"
        >
          {triaging ? "Sorting..." : "Auto-tag"}
        </button>

        <span className="hidden shrink-0 text-xs text-[var(--text-faint)] md:inline">
          {new Date(issue.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>

        <button
          type="button"
          title="Delete issue"
          onClick={() => onDelete(issue.id)}
          className="rounded-lg p-1.5 text-[var(--text-faint)] opacity-70 transition hover:bg-[#FAE7EB] hover:text-[#B04456] group-hover:opacity-100 dark:hover:bg-[#3A2126] dark:hover:text-[#F0A3B0]"
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

      {expanded && (
        <div className="space-y-3 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 px-14 py-3.5 text-sm text-[var(--text-muted)]">
          <p className="whitespace-pre-wrap leading-relaxed">
            {issue.description || "No notes yet."}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-faint)]">Due:</span>
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(issue.due_at)}
              onChange={(e) =>
                onUpdate(issue.id, { due_at: fromDateTimeLocalValue(e.target.value) })
              }
              className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-main)] focus:border-[#D49A80] focus:outline-none"
            />
            {issue.due_at && (
              <button
                type="button"
                onClick={() => onUpdate(issue.id, { due_at: null })}
                className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text-main)]"
              >
                Clear
              </button>
            )}
          </div>

          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:hidden">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getLabelStyle(label)}`}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {triageError && (
            <p className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-3.5 py-2 text-xs text-[#9E4555] dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0]">
              {triageError}
            </p>
          )}

          {triageResult && (
            <div className="rounded-xl border border-[#DCD4F0] bg-[#F5F2FC] p-3.5 text-xs dark:border-[#494066] dark:bg-[#2A253B]">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#4E407A] dark:text-[#CFC5F0]">
                  Suggested triage
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTriage}
                    className="rounded-lg bg-[#6D5DA1] px-3 py-1 font-medium text-white transition hover:bg-[#5B4D8A]"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageResult(null)}
                    className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <p className="font-medium text-[var(--text-main)]">
                {triageResult.one_line_summary}
              </p>
              <p className="mt-1 text-[var(--text-muted)]">{triageResult.reasoning}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-0.5 font-medium text-[var(--text-main)]">
                  <PriorityIcon
                    priority={triageResult.suggested_priority}
                    className="h-3.5 w-3.5"
                  />
                  {PRIORITY_LABEL[triageResult.suggested_priority]}
                </span>
                {triageResult.suggested_labels.map((label) => (
                  <span
                    key={label}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getLabelStyle(label)}`}
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
