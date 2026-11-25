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
          className={`${className} text-[#C25464]`}
          aria-label="Urgent priority"
        >
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="13"
            rx="3.5"
            fill="#FADCE1"
            stroke="currentColor"
            strokeWidth="1.35"
          />
          <path
            d="M8 4.6V8.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.35" r="0.95" fill="currentColor" />
        </svg>
      );
    case "high":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#C96B4B]`}
          aria-label="High priority"
        >
          <rect x="2" y="9.5" width="2.6" height="4.5" rx="0.9" fill="currentColor" />
          <rect x="6.7" y="6" width="2.6" height="8" rx="0.9" fill="currentColor" />
          <rect x="11.4" y="2.5" width="2.6" height="11.5" rx="0.9" fill="currentColor" />
        </svg>
      );
    case "medium":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#B5892E]`}
          aria-label="Medium priority"
        >
          <rect x="2" y="9.5" width="2.6" height="4.5" rx="0.9" fill="currentColor" />
          <rect x="6.7" y="6" width="2.6" height="8" rx="0.9" fill="currentColor" />
          <rect
            x="11.4"
            y="2.5"
            width="2.6"
            height="11.5"
            rx="0.9"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </svg>
      );
    case "low":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#5D8596]`}
          aria-label="Low priority"
        >
          <rect x="2" y="9.5" width="2.6" height="4.5" rx="0.9" fill="currentColor" />
          <rect
            x="6.7"
            y="6"
            width="2.6"
            height="8"
            rx="0.9"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <rect
            x="11.4"
            y="2.5"
            width="2.6"
            height="11.5"
            rx="0.9"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#B3A99E]`}
          aria-label="No priority"
        >
          <path
            d="M2.5 8H5M6.75 8H9.25M11 8H13.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
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
          className={`${className} text-[#4C8265]`}
          aria-label="Done"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="#DCECE2"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M5.2 8.2L7.1 10.1L10.9 6.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "in_progress":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#BA8428]`}
          aria-label="In progress"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="#FCF2D9"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M8 4.25A3.75 3.75 0 0 1 8 11.75Z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} text-[#A59B90]`}
          aria-label="Open"
        >
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

export function CatDoodle({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 36C14 26 18 18 24 17L21 9L29 14C31 13.5 33 13.5 35 14L43 9L40 17C46 18 50 26 48 36C46.5 41 17.5 41 16 36Z"
        fill="#F4EAE0"
        stroke="#8C7E72"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M25 26.5C26 25.3 27.5 25.3 28.5 26.5M35.5 26.5C36.5 25.3 38 25.3 39 26.5"
        stroke="#5E534B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M30.5 30.5C31.3 31.3 32.7 31.3 33.5 30.5"
        stroke="#C96B4B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11 28H17M12 31.5H17M47 28H53M47 31.5H52"
        stroke="#B3A99E"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
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
