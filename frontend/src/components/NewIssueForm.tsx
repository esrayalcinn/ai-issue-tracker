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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2B2623]/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-[#E5DDD2] bg-[#FFFDF9] p-6 shadow-xl shadow-[#2B2623]/10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-[#2B2623]">
            New issue
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-xs text-[#8C8177] hover:bg-[#F3EDE5] hover:text-[#2B2623]"
          >
            Close
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-3.5 py-2 text-xs text-[#9E4555]">
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
            className="w-full bg-transparent text-base font-semibold text-[#2B2623] placeholder-[#B0A69C] focus:outline-none"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a few notes or steps to reproduce..."
            rows={4}
            className="w-full resize-none rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] p-3 text-sm text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:bg-[#FFFDF9] focus:outline-none"
            required
          />

          {checkingDups && (
            <p className="text-xs text-[#9C9186]">
              Checking for similar issues...
            </p>
          )}

          {!checkingDups && duplicates !== null && duplicates.length > 0 && (
            <div className="rounded-xl border border-[#EFE0B4] bg-[#FCF6E3] p-3">
              <p className="mb-2 text-xs font-semibold text-[#8A671F]">
                Heads up — this looks similar to {duplicates.length} existing{" "}
                {duplicates.length === 1 ? "issue" : "issues"}
              </p>
              <ul className="space-y-1.5">
                {duplicates.map(({ issue, similarity }) => (
                  <li
                    key={issue.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#FFFDF9] px-2.5 py-1.5 text-xs border border-[#F0E6C8]"
                  >
                    <span className="truncate text-[#2B2623]">
                      <span className="mr-1.5 font-mono text-[#9C9186]">
                        #{issue.id}
                      </span>
                      {issue.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#FCF2D9] px-2 py-0.5 font-mono text-[11px] font-medium text-[#8A671F]">
                      {Math.round(similarity * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-medium text-[#786F68]">
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
                        ? "border-[#D9A791] bg-[#FBEBE2] text-[#7D3E28]"
                        : "border-[#E5DDD2] bg-[#FAF7F2] text-[#6B615A] hover:bg-[#F3EDE5]"
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
            <span className="mb-1.5 block text-xs font-medium text-[#786F68]">
              Labels (comma-separated)
            </span>
            <input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="bug, frontend, study"
              className="w-full rounded-xl border border-[#E5DDD2] bg-[#FAF7F2] px-3 py-2 text-sm text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:bg-[#FFFDF9] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#ECE5DC] pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#E5DDD2] px-3.5 py-1.5 text-xs font-medium text-[#6B615A] hover:bg-[#F3EDE5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#C96B4B] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#B55C3E] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save issue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
