import { IssuePriority, IssueStatus } from "@/lib/api";

export function PriorityIcon({
  priority,
  className = "h-4 w-4",
}: {
  priority: IssuePriority | null;
  className?: string;
}) {
  switch (priority) {
    case "urgent":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-rose-400`}
          aria-label="Urgent priority"
        >
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 4.5V8.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="11.35" r="0.95" fill="currentColor" />
        </svg>
      );
    case "high":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-amber-400`}
          aria-label="High priority"
        >
          <rect x="2" y="9.5" width="2.5" height="4.5" rx="0.8" fill="currentColor" />
          <rect x="6.75" y="6" width="2.5" height="8" rx="0.8" fill="currentColor" />
          <rect x="11.5" y="2.5" width="2.5" height="11.5" rx="0.8" fill="currentColor" />
        </svg>
      );
    case "medium":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-sky-400`}
          aria-label="Medium priority"
        >
          <rect x="2" y="9.5" width="2.5" height="4.5" rx="0.8" fill="currentColor" />
          <rect x="6.75" y="6" width="2.5" height="8" rx="0.8" fill="currentColor" />
          <rect x="11.5" y="2.5" width="2.5" height="11.5" rx="0.8" fill="currentColor" fillOpacity="0.22" />
        </svg>
      );
    case "low":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-zinc-400`}
          aria-label="Low priority"
        >
          <rect x="2" y="9.5" width="2.5" height="4.5" rx="0.8" fill="currentColor" />
          <rect x="6.75" y="6" width="2.5" height="8" rx="0.8" fill="currentColor" fillOpacity="0.22" />
          <rect x="11.5" y="2.5" width="2.5" height="11.5" rx="0.8" fill="currentColor" fillOpacity="0.22" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-zinc-500`}
          aria-label="No priority"
        >
          <path d="M2.5 8H5M6.75 8H9.25M11 8H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StatusIcon({
  status,
  className = "h-4 w-4",
}: {
  status: IssueStatus;
  className?: string;
}) {
  switch (status) {
    case "done":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-emerald-400`}
          aria-label="Done"
        >
          <circle cx="8" cy="8" r="6.25" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.2 8.2L7.1 10.1L10.9 6.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "in_progress":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-amber-400`}
          aria-label="In progress"
        >
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 4.25A3.75 3.75 0 0 1 8 11.75Z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-zinc-400`}
          aria-label="Open"
        >
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

export const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  "": "No priority",
};

export const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
};
