import type { AuditStatus } from "../types";

interface StatusBadgeProps {
  status: AuditStatus;
  className?: string;
}

const STATUS_CONFIG: Record<AuditStatus, { label: string; className: string }> =
  {
    Draft: { label: "Draft", className: "status-draft" },
    "Pending Review": {
      label: "Pending Review",
      className: "status-pending-review",
    },
    "Pending Approval": {
      label: "Pending Approval",
      className: "status-pending-approval",
    },
    Completed: { label: "Completed", className: "status-completed" },
    "Returned for Correction": {
      label: "Returned for Correction",
      className: "status-returned",
    },
  };

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "status-draft",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
