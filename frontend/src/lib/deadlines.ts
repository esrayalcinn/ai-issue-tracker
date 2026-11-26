import { Issue } from "@/lib/api";

export type DeadlineUrgency = "overdue" | "hour" | "soon" | "week" | "later";

export interface DeadlineInfo {
  urgency: DeadlineUrgency;
  label: string;
  badgeClass: string;
  diffMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function getDeadlineInfo(
  dueAt: string | null | undefined,
  nowMs: number = Date.now(),
): DeadlineInfo | null {
  if (!dueAt) return null;
  const target = new Date(dueAt).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - nowMs;

  if (diffMs <= 0) {
    const overdueHours = Math.floor(Math.abs(diffMs) / HOUR);
    const label =
      overdueHours < 1
        ? "Overdue"
        : overdueHours < 24
          ? `${overdueHours}h overdue`
          : `${Math.floor(overdueHours / 24)}d overdue`;
    return {
      urgency: "overdue",
      label,
      badgeClass: "border-[#EFCFD6] bg-[#FAE7EB] text-[#9E4555]",
      diffMs,
    };
  }

  if (diffMs <= HOUR) {
    const mins = Math.max(1, Math.ceil(diffMs / MINUTE));
    return {
      urgency: "hour",
      label: `in ${mins} min`,
      badgeClass: "border-[#EFCFD6] bg-[#FAE7EB] text-[#9E4555]",
      diffMs,
    };
  }

  if (diffMs <= 3 * DAY) {
    const hours = Math.ceil(diffMs / HOUR);
    const label =
      hours < 24 ? `in ${hours}h` : `in ${Math.ceil(diffMs / DAY)}d`;
    return {
      urgency: "soon",
      label,
      badgeClass: "border-[#EFE0B4] bg-[#FCF3D9] text-[#8A671F]",
      diffMs,
    };
  }

  if (diffMs <= 7 * DAY) {
    const days = Math.ceil(diffMs / DAY);
    return {
      urgency: "week",
      label: `in ${days}d`,
      badgeClass: "border-[#C9DFEB] bg-[#E5F0F6] text-[#3E6B80]",
      diffMs,
    };
  }

  return {
    urgency: "later",
    label: new Date(target).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    badgeClass: "border-[#E5DDD2] bg-[#FAF7F2] text-[#786F68]",
    diffMs,
  };
}

export interface IssueReminder {
  issue: Issue;
  info: DeadlineInfo;
}

export function getUpcomingReminders(
  issues: Issue[],
  nowMs: number = Date.now(),
): IssueReminder[] {
  const reminders: IssueReminder[] = [];
  for (const issue of issues) {
    if (issue.status === "done" || !issue.due_at) continue;
    const info = getDeadlineInfo(issue.due_at, nowMs);
    if (info && info.urgency !== "later") {
      reminders.push({ issue, info });
    }
  }
  reminders.sort((a, b) => a.info.diffMs - b.info.diffMs);
  return reminders;
}

export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(val: string): string | null {
  if (!val.trim()) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
