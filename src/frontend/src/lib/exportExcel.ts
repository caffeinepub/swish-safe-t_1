import { getPSConfig } from "../components/PowerSupplyTable";
import type {
  Audit,
  AuditAnswer,
  CriticalObservation,
  PowerSupplyData,
} from "../types";
import type { Template } from "../types";
import type { Site } from "../types";
import type { Client } from "../types";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function exportAuditToCSV(
  audit: Audit,
  template: Template,
  site: Site,
  client: Client,
): void {
  const rows: string[][] = [];

  // Header info
  rows.push(["SWiSH SAFE-T \u2014 Audit Report"]);
  rows.push(["Client", client.name]);
  rows.push(["Site", site.name]);
  rows.push(["Address", site.address ?? ""]);
  rows.push(["Template", template.name]);
  rows.push(["Status", audit.status]);
  rows.push(["Date", formatDate(audit.updatedAt)]);
  rows.push(["Submitted By", audit.submittedBy ?? ""]);
  rows.push(["Approved By", audit.approvedBy ?? ""]);
  if (audit.rejectionNote) {
    rows.push(["Rejection Note", audit.rejectionNote]);
  }
  rows.push([]);

  for (const section of template.sections) {
    rows.push([`SECTION: ${section.title}`]);
    rows.push(["#", "Question", "Answer", "Remarks"]);

    for (let qi = 0; qi < section.questions.length; qi++) {
      const q = section.questions[qi];
      const ans: AuditAnswer = audit.answers[q.id] ?? {
        answer: "",
        remarks: "",
        images: [],
      };
      rows.push([String(qi + 1), q.text, ans.answer, ans.remarks]);
    }

    // Critical observations
    const obs: CriticalObservation[] = audit.observations[section.id] ?? [];
    if (section.hasCriticalObservations && obs.length > 0) {
      rows.push([]);
      rows.push(["Critical Observations"]);
      rows.push(["#", "Remarks", "Recommendations"]);
      for (let i = 0; i < obs.length; i++) {
        rows.push([String(i + 1), obs[i].remarks, obs[i].recommendations]);
      }
    }

    // Power supply
    const ps: PowerSupplyData | undefined = audit.powerSupply[section.id];
    if (section.hasPowerSupply && ps && ps.rows.length > 0) {
      rows.push([]);
      rows.push(["Power Supply Details", `Type: ${ps.type}`]);
      const psConfig = getPSConfig(ps.type);
      const headerRow = [
        "Circuit Name",
        ...psConfig.flatMap((g) => g.labels ?? g.subCols),
      ];
      rows.push(headerRow);
      for (const row of ps.rows) {
        const dataRow = [
          row.circuitName,
          ...psConfig.flatMap((g) =>
            (g.labels ?? g.subCols).map(
              (_, i) => row.values[g.subCols[i]] ?? "",
            ),
          ),
        ];
        rows.push(dataRow);
      }
    }

    rows.push([]);
  }

  // Convert to CSV string
  const rowsStr = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");

  const csvContent = `\uFEFF${rowsStr}`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-${site.name.replace(/\s+/g, "-")}-${formatDate(audit.updatedAt)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
