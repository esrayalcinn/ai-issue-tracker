"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  checkDuplicates,
  IssueCreate,
  IssuePriority,
  SimilarIssue,
} from "@/lib/api";
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
  const [submitting, setSubmitting] = useState(false);
  const [checkingDups, setCheckingDups] = useState(false);
  const [duplicates, setDuplicates] = useState<SimilarIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Automatically check for duplicates 600ms after the user pauses typing
  useEffect(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 4 || trimmedDesc.length < 4) {
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
        // Don't block issue creation if duplicate check fails
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
    if (!trimmedTitle || !trimmedDesc) {
      setError("Title and description are required.");
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
      });
      setTitle("");
      setDescription("");
      setPriority(null);
      setLabelsInput("");
      setDuplicates(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">New Issue</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Esc
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-800/80 bg-rose-950/60 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            maxLength={200}
            autoFocus
            className="w-full bg-transparent text-lg font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description, steps to reproduce, or notes..."
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            required
          />

          {/* Automatic Duplicate Detection Banner */}
          {checkingDups && (
            <p className="text-xs text-zinc-500">
              Checking for similar existing issues...
            </p>
          )}

          {!checkingDups && duplicates !== null && duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-300">
                Warning: This may duplicate an existing issue ({duplicates.length})
              </p>
              <ul className="space-y-1.5">
                {duplicates.map(({ issue, similarity }) => (
                  <li
                    key={issue.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate text-zinc-200">
                      <span className="mr-1.5 font-mono text-zinc-500">
                        ISS-{issue.id}
                      </span>
                      {issue.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                      {Math.round(similarity * 100)}% match
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Priority icon picker */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
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
                        ? "border-indigo-500/70 bg-indigo-500/15 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                    <span>{PRIORITY_LABEL[p ?? ""]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Labels (comma-separated)
            </span>
            <input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="bug, frontend, auth"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Issue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
