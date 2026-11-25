const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function checkBackendHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

// TODO (Milestone 2 — write these by hand!):
// Define your TypeScript `Issue` interface and functions for:
// - listIssues(filters?)
// - createIssue(payload)
// - updateIssue(id, payload)
// - deleteIssue(id)
//
// Later milestones:
// - checkDuplicates(title, description)
// - triageIssue(id)

export type IssueStatus = "open" | "in_progress" | "done";
export type IssuePriority = "low" | "medium" | "high" | "urgent";

export interface Issue {
  id: number;
  title: string;
  description: string;
  labels: string[];
  priority: IssuePriority | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
}

export interface IssueCreate {
  title: string;
  description: string;
  labels?: string[];
  priority?: IssuePriority | null;
  status?: IssueStatus;
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  labels?: string[];
  priority?: IssuePriority | null;
  status?: IssueStatus;
}

export async function listIssues(filters?: {
  status?: IssueStatus;
  priority?: IssuePriority;
  label?: string;
}): Promise<Issue[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.label) params.set("label", filters.label);

  const qs = params.toString();
  const res = await fetch(`${API_URL}/issues${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to list issues (${res.status})`);
  return res.json();
}

export async function createIssue(payload: IssueCreate): Promise<Issue> {
  const res = await fetch(`${API_URL}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create issue (${res.status})`);
  return res.json();
}

export async function updateIssue(id: number, payload: IssueUpdate): Promise<Issue> {
  const res = await fetch(`${API_URL}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update issue (${res.status})`);
  return res.json();
}

export async function deleteIssue(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/issues/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete issue (${res.status})`);
}