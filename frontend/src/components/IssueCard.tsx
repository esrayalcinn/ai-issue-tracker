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
  "bg-[#E8F1EC] text-[#3F6B54] border-[#CDE0D5]",
  "bg-[#FBEBE2] text-[#9E5238] border-[#F0D3C2]",
  "bg-[#EEEAF8] text-[#5B4D8A] border-[#DCD4F0]",
  "bg-[#FCF3D9] text-[#8A671F] border-[#EFE0B4]",
  "bg-[#E5F0F6] text-[#3E6B80] border-[#C9DFEB]",
  "bg-[#FAE7EB] text-[#9E4555] border-[#EFCFD6]",
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
    <article className="group relative border-b border-[#ECE5DC] last:border-b-0 transition-colors hover:bg-[#FAF6F0]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="relative">
          <button
            type="button"
            title={`Priority: ${PRIORITY_LABEL[issue.priority ?? ""]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition hover:border-[#E5DDD2] hover:bg-[#F3EDE5]"
          >
            <PriorityIcon priority={issue.priority} />
          </button>

          {openMenu === "priority" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-xl border border-[#E5DDD2] bg-[#FFFDF9] p-1.5 shadow-md shadow-[#2B2623]/5">
              {PRIORITIES.map((p) => (
                <button
                  key={p ?? "none"}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { priority: p });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${issue.priority === p
                      ? "bg-[#F3EDE5] font-medium text-[#2B2623]"
                      : "text-[#5E554E] hover:bg-[#FAF6F0]"
                    }`}
                >
                  <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                  <span>{PRIORITY_LABEL[p ?? ""]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="w-12 shrink-0 font-mono text-xs text-[#9C9186]">
          #{issue.id}
        </span>

        <div className="relative">
          <button
            type="button"
            title={`Status: ${STATUS_LABEL[issue.status]} (click to change)`}
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition hover:border-[#E5DDD2] hover:bg-[#F3EDE5]"
          >
            <StatusIcon status={issue.status} />
          </button>

          {openMenu === "status" && (
            <div className="absolute left-0 top-8 z-20 w-36 rounded-xl border border-[#E5DDD2] bg-[#FFFDF9] p-1.5 shadow-md shadow-[#2B2623]/5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onUpdate(issue.id, { status: s });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${issue.status === s
                      ? "bg-[#F3EDE5] font-medium text-[#2B2623]"
                      : "text-[#5E554E] hover:bg-[#FAF6F0]"
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
            className={`block truncate text-[14px] font-medium ${issue.status === "done"
                ? "text-[#A3998F] line-through"
                : "text-[#2B2623]"
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
          className="shrink-0 rounded-lg border border-[#DCD4F0] bg-[#F2EFFA] px-2.5 py-1 text-[11px] font-medium text-[#5B4D8A] transition hover:border-[#C5B8E6] hover:bg-[#E9E3F7] disabled:opacity-50"
        >
          {triaging ? "Sorting..." : "Auto-tag"}
        </button>

        <span className="hidden shrink-0 text-xs text-[#9C9186] md:inline">
          {new Date(issue.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>

        <button
          type="button"
          title="Delete issue"
          onClick={() => onDelete(issue.id)}
          className="rounded-lg p-1.5 text-[#A89E94] opacity-70 transition hover:bg-[#FAE7EB] hover:text-[#B04456] group-hover:opacity-100"
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
        <div className="space-y-3 border-t border-[#F0EAE2] bg-[#F7F2EB]/60 px-14 py-3.5 text-sm text-[#5E554E]">
          <p className="whitespace-pre-wrap leading-relaxed">
            {issue.description || "No notes yet."}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#8C8177]">Due:</span>
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(issue.due_at)}
              onChange={(e) =>
                onUpdate(issue.id, { due_at: fromDateTimeLocalValue(e.target.value) })
              }
              className="rounded-lg border border-[#E5DDD2] bg-[#FFFDF9] px-2 py-1 text-xs text-[#2B2623] focus:border-[#D49A80] focus:outline-none"
            />
            {issue.due_at && (
              <button
                type="button"
                onClick={() => onUpdate(issue.id, { due_at: null })}
                className="text-[11px] text-[#8C8177] hover:text-[#2B2623]"
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
            <p className="rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-3.5 py-2 text-xs text-[#9E4555]">
              {triageError}
            </p>
          )}

          {triageResult && (
            <div className="rounded-xl border border-[#DCD4F0] bg-[#F5F2FC] p-3.5 text-xs">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#4E407A]">
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
                    className="rounded-lg border border-[#DCD4F0] bg-white px-2.5 py-1 text-[#6F648C] hover:bg-[#FAF8FE]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <p className="font-medium text-[#2B2623]">
                {triageResult.one_line_summary}
              </p>
              <p className="mt-1 text-[#6B615A]">{triageResult.reasoning}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-lg border border-[#E5DDD2] bg-[#FFFDF9] px-2.5 py-0.5 font-medium text-[#2B2623]">
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
