"use client";

import { useCallback, useEffect, useState } from "react";
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
import { PRIORITY_LABEL, PriorityIcon, STATUS_LABEL, StatusIcon } from "@/components/Icons";
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
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

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
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  async function handleCreate(payload: IssueCreate) {
    await createIssue(payload);
    setShowNewForm(false);
    await fetchIssues();
  }

  async function handleUpdate(id: number, payload: IssueUpdate) {
    setError(null);
    try {
      const updated = await updateIssue(id, payload);
      setIssues((prev) => prev.map((item) => (item.id === id ? updated : item)));
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M3 4.5H13M3 8H10M3 11.5H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              AI Issue Tracker
            </h1>
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-800">
              {issues.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                apiStatus === "online"
                  ? "border-emerald-800/80 bg-emerald-950/60 text-emerald-300"
                  : apiStatus === "offline"
                    ? "border-rose-800/80 bg-rose-950/60 text-rose-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  apiStatus === "online"
                    ? "bg-emerald-400"
                    : apiStatus === "offline"
                      ? "bg-rose-400"
                      : "bg-zinc-500"
                }`}
              />
              API {apiStatus}
            </span>

            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-500 transition"
            >
              + New Issue
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {/* Status Tabs + Priority Symbol Filter + Label Search */}
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/70 p-1">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-zinc-800 text-zinc-100 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
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
            {/* Priority Symbol Pills */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/70 p-1">
              {PRIORITY_FILTERS.map((p) => {
                const active = priorityFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    title={`Filter: ${PRIORITY_LABEL[p]}`}
                    onClick={() => setPriorityFilter(active ? "" : p)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                      active
                        ? "bg-zinc-700 ring-1 ring-indigo-500/70"
                        : "hover:bg-zinc-800"
                    }`}
                  >
                    <PriorityIcon priority={p} className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Label search */}
            <input
              type="text"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              placeholder="Filter label..."
              className="w-40 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />

            {(statusFilter || priorityFilter || labelFilter) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setLabelFilter("");
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-800/80 bg-rose-950/60 px-4 py-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Issue List */}
        {loading ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 py-14 text-center text-sm text-zinc-500">
            Loading issues...
          </div>
        ) : issues.length === 0 ? (
          <section className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-14 text-center">
            <p className="text-sm font-medium text-zinc-300">No issues match</p>
            <p className="mt-1 text-xs text-zinc-500">
              Click <strong>+ New Issue</strong> to add your first ticket.
            </p>
          </section>
        ) : (
          <section className="overflow-visible rounded-xl border border-zinc-800/90 bg-zinc-900/40">
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

        <p className="mt-4 text-center text-[11px] text-zinc-600">
          Tip: Click any priority or status icon to change it, or click a title to expand details.
        </p>
      </main>

      {showNewForm && (
        <NewIssueForm
          onCreate={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}
