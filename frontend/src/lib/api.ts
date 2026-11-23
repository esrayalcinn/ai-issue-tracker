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
