"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  checkBackendHealth,
  createIssue,
  deleteIssue,
  Issue,
  IssueCreate,
  IssuePriority,
  IssueStatus,
  IssueUpdate,
  listIssues,
  updateIssue,
} from "@/lib/api";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { CatCompanion } from "@/components/CatCompanion";
import { CatMascot } from "@/components/CatMascot";
import {
  PRIORITY_LABEL,
  PriorityIcon,
  STATUS_LABEL,
  StatusIcon,
} from "@/components/Icons";
import { IssueCard } from "@/components/IssueCard";
import { NewIssueForm } from "@/components/NewIssueForm";

const STATUS_TABS: { value: IssueStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_FILTERS: IssuePriority[] = ["urgent", "high", "medium", "low"];

export default function HomePage() {
  const [apiOffline, setApiOffline] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<IssueStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | "">("");
  const [labelFilter, setLabelFilter] = useState("");

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listIssues({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        label: labelFilter.trim() || undefined,
      });
      setIssues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, labelFilter]);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setApiOffline(false))
      .catch(() => setApiOffline(true));
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  async function handleCreate(payload: IssueCreate) {
    await createIssue(payload);
    setShowNewForm(false);
    await fetchIssues();
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || quickSaving) return;
    setQuickSaving(true);
    setError(null);
    try {
      await createIssue({ title: trimmed, description: "" });
      setQuickTitle("");
      await fetchIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to quick-add item");
    } finally {
      setQuickSaving(false);
    }
  }

  async function handleUpdate(id: number, payload: IssueUpdate) {
    setError(null);
    try {
      const updated = await updateIssue(id, payload);
      setIssues((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (payload.status === "done") {
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 2200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteIssue(id);
      setIssues((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete issue");
    }
  }

  const openIssues = issues.filter((i) => i.status !== "done");

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2B2623]">
      <div className="mx-auto max-w-4xl px-6 pb-48 pt-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#E8E0D5] pb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#9C9186]">
              Personal Workspace
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="font-display text-3xl font-medium tracking-tight text-[#2B2623]">
                Issue Notebook
              </h1>
              <span className="font-mono text-xs text-[#9C9186]">
                {issues.length} {issues.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAssistant((prev) => !prev)}
              className="rounded-xl border border-[#DCD4F0] bg-[#F2EFFA] px-3.5 py-2 text-xs font-medium text-[#5B4D8A] transition hover:border-[#C5B8E6] hover:bg-[#E9E3F7]"
            >
              {showAssistant ? "Hide assistant" : "Ask assistant"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="rounded-xl bg-[#C96B4B] px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-[#B55C3E]"
            >
              + New issue
            </button>
          </div>
        </header>

        <form
          onSubmit={handleQuickAdd}
          className="mb-5 flex items-center gap-2 rounded-2xl border border-[#E5DDD2] bg-[#FFFDF9] px-3.5 py-2 shadow-2xs"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add a to-do or bug and press Enter..."
            maxLength={200}
            className="flex-1 bg-transparent text-sm text-[#2B2623] placeholder-[#A89E94] focus:outline-none"
          />
          <button
            type="submit"
            disabled={quickSaving || !quickTitle.trim()}
            className="rounded-lg bg-[#F3EDE5] px-3 py-1 text-xs font-medium text-[#5E554E] transition hover:bg-[#E8DFD3] hover:text-[#2B2623] disabled:opacity-40"
          >
            {quickSaving ? "Adding..." : "Add"}
          </button>
        </form>

        {apiOffline && (
          <div className="mb-5 rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-4 py-2.5 text-xs text-[#9E4555]">
            Backend API is unreachable. Make sure FastAPI is running on localhost:8000.
          </div>
        )}

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-[#E5DDD2] bg-[#F3EDE5]/70 p-1">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-[#FFFDF9] text-[#2B2623] shadow-2xs"
                      : "text-[#786F68] hover:text-[#2B2623]"
                  }`}
                >
                  {tab.value !== "" && (
                    <StatusIcon status={tab.value} className="h-3.5 w-3.5" />
                  )}
                  <span>{tab.value === "" ? tab.label : STATUS_LABEL[tab.value]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#E5DDD2] bg-[#F3EDE5]/70 p-1">
              {PRIORITY_FILTERS.map((p) => {
                const active = priorityFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    title={`Filter: ${PRIORITY_LABEL[p]}`}
                    onClick={() => setPriorityFilter(active ? "" : p)}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg transition ${
                      active
                        ? "bg-[#FFFDF9] ring-1 ring-[#D9A791]"
                        : "hover:bg-[#FFFDF9]/70"
                    }`}
                  >
                    <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              placeholder="Filter by label..."
              className="w-40 rounded-xl border border-[#E5DDD2] bg-[#FFFDF9] px-3 py-1.5 text-xs text-[#2B2623] placeholder-[#A89E94] focus:border-[#D49A80] focus:outline-none"
            />

            {(statusFilter || priorityFilter || labelFilter) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setLabelFilter("");
                }}
                className="text-xs text-[#8C8177] underline-offset-2 hover:text-[#2B2623] hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-[#EFCFD6] bg-[#FAE7EB] px-4 py-3 text-xs text-[#9E4555]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#E5DDD2] bg-[#FFFDF9] py-14 text-center text-sm text-[#9C9186]">
            Loading notes...
          </div>
        ) : issues.length === 0 ? (
          <section className="flex flex-col items-center rounded-2xl border border-dashed border-[#DFD5C8] bg-[#FFFDF9]/70 py-14 text-center">
            <CatMascot mood="sleeping" size="lg" />
            <p className="mt-2 font-display text-base font-medium text-[#2B2623]">
              All clear for now
            </p>
            <p className="mt-1 text-xs text-[#8C8177]">
              Nothing matches this view. Add a new issue whenever something pops up.
            </p>
          </section>
        ) : (
          <section className="overflow-visible rounded-2xl border border-[#E5DDD2] bg-[#FFFDF9] shadow-xs shadow-[#2B2623]/3">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </div>

      {!showAssistant && (
        <CatCompanion
          openIssues={openIssues}
          celebrating={celebrating}
          onNewIssue={() => setShowNewForm(true)}
          onOpenFullChat={() => setShowAssistant(true)}
          onBoardMutated={fetchIssues}
        />
      )}

      {showNewForm && (
        <NewIssueForm
          onCreate={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {showAssistant && (
        <AssistantDrawer
          onClose={() => setShowAssistant(false)}
          onBoardMutated={fetchIssues}
        />
      )}
    </div>
  );
}
