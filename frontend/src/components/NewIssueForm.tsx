"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  checkDuplicates,
  IssueCreate,
  IssuePriority,
  SimilarIssue,
} from "@/lib/api";
import { fromDateTimeLocalValue } from "@/lib/deadlines";
import { PRIORITY_LABEL, PriorityIcon } from "@/components/Icons";

interface NewIssueFormProps {
  onCreate: (payload: IssueCreate) => Promise<void>;
  onCancel: () => void;
}

const PRIORITY_OPTIONS: (IssuePriority | null)[] = [null, "low", "medium", "high", "urgent"];

export function NewIssueForm({ onCreate, onCancel }: NewIssueFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority | null>(null);
  const [labelsInput, setLabelsInput] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingDups, setCheckingDups] = useState(false);
  const [duplicates, setDuplicates] = useState<SimilarIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 4) {
      setDuplicates(null);
      setCheckingDups(false);
      return;
    }

    let cancelled = false;
    setCheckingDups(true);

    const timer = setTimeout(async () => {
      try {
        const matches = await checkDuplicates(trimmedTitle, trimmedDesc);
        if (!cancelled) {
          setDuplicates(matches);
        }
      } catch {
        if (!cancelled) setDuplicates(null);
      } finally {
        if (!cancelled) setCheckingDups(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, description]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    const labels = labelsInput
      .split(",")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await onCreate({
        title: trimmedTitle,
        description: trimmedDesc,
        priority,
        labels,
        due_at: fromDateTimeLocalValue(dueInput),
      });
      setTitle("");
      setDescription("");
      setPriority(null);
      setLabelsInput("");
      setDueInput("");
      setDuplicates(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-[var(--text-main)]">
            New issue
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"
          >
            Close
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-3.5 py-2 text-xs text-[#9E4555] dark:border-[#63363F] dark:bg-[#3A2126] dark:text-[#F0A3B0]">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs fixing or building?"
            maxLength={200}
            autoFocus
            className="w-full bg-transparent text-base font-semibold text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes or steps to reproduce..."
            rows={4}
            className="w-full resize-none rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] focus:border-[#D49A80] focus:bg-[var(--bg-surface)] focus:outline-none"
          />

          {checkingDups && (
            <p className="text-xs text-[var(--text-faint)]">
              Checking for similar issues...
            </p>
          )}

          {!checkingDups && duplicates !== null && duplicates.length > 0 && (
            <div className="rounded-xl border border-[#EFE0B4] bg-[#FCF6E3] p-3 dark:border-[#5C4B24] dark:bg-[#382F1B]">
              <p className="mb-2 text-xs font-semibold text-[#8A671F] dark:text-[#E8C97A]">
                Heads up — this looks similar to {duplicates.length} existing{" "}
                {duplicates.length === 1 ? "issue" : "issues"}
              </p>
              <ul className="space-y-1.5">
                {duplicates.map(({ issue, similarity }) => (
                  <li
                    key={issue.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate text-[var(--text-main)]">
                      <span className="mr-1.5 font-mono text-[var(--text-faint)]">
                        #{issue.id}
                      </span>
                      {issue.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#FCF2D9] px-2 py-0.5 font-mono text-[11px] font-medium text-[#8A671F] dark:bg-[#4A3D21] dark:text-[#E8C97A]">
                      {Math.round(similarity * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Priority
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p ?? "none"}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-[#D9A791] bg-[#FBEBE2] text-[#7D3E28] dark:border-[#8C523D] dark:bg-[#3B261E] dark:text-[#F0B69E]"
                        : "border-[var(--border-main)] bg-[var(--bg-page)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                    <span>{PRIORITY_LABEL[p ?? ""]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                Due date &amp; time (optional)
              </span>
              <input
                type="datetime-local"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-3 py-2 text-xs text-[var(--text-main)] focus:border-[#D49A80] focus:bg-[var(--bg-surface)] focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                Labels (comma-separated)
              </span>
              <input
                type="text"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                placeholder="bug, frontend, study"
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-page)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:border-[#D49A80] focus:bg-[var(--bg-surface)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--border-main)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#C96B4B] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-50 dark:bg-[#D47D60] dark:hover:bg-[#C46C4F]"
            >
              {submitting ? "Saving..." : "Save issue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
