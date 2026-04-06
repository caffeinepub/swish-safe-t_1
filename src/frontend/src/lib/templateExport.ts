import type { Template } from "../types";

// ===== JSON Export =====
export function exportTemplateAsJSON(template: Template): void {
  const json = JSON.stringify(template, null, 2);
  downloadBlob(json, `${sanitize(template.name)}.json`, "application/json");
}

// ===== Excel (CSV) Export =====
export function exportTemplateAsExcel(template: Template): void {
  const rows: string[][] = [];
  rows.push(["Template Name", template.name]);
  rows.push(["Exported At", new Date().toLocaleString("en-IN")]);
  rows.push([]);
  for (const section of template.sections) {
    rows.push(["Section", section.title]);
    rows.push([
      "Question ID",
      "Question Text",
      "Type",
      "Options",
      "Required",
      "Image Required",
      "Default Remarks",
    ]);
    for (const q of section.questions) {
      const remarks = Object.entries(q.optionRemarks ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      rows.push([
        q.id,
        q.text,
        q.type,
        q.options.join(", "),
        q.required ? "Yes" : "No",
        q.imageRequired ? "Yes" : "No",
        remarks,
      ]);
    }
    rows.push([]);
  }

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");

  const BOM = "\uFEFF";
  downloadBlob(
    BOM + csv,
    `${sanitize(template.name)}.csv`,
    "text/csv;charset=utf-8;",
  );
}

// ===== Word (.docx) Export =====
export async function exportTemplateAsWord(template: Template): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } =
    await import("docx");

  const children: any[] = [
    new Paragraph({
      text: template.name,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported: ${new Date().toLocaleString("en-IN")}`,
          italics: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const section of template.sections) {
    children.push(
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }),
    );
    let qNum = 1;
    for (const q of section.questions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Q${qNum}. `, bold: true }),
            new TextRun({ text: q.text }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Options: ", bold: true }),
            new TextRun({ text: q.options.join(", ") }),
          ],
          indent: { left: 360 },
        }),
      );
      if (q.required || q.imageRequired) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Flags: ", bold: true }),
              new TextRun({
                text: [
                  q.required && "Mandatory",
                  q.imageRequired && "Image Required",
                ]
                  .filter(Boolean)
                  .join(", "),
              }),
            ],
            indent: { left: 360 },
          }),
        );
      }
      const remarkEntries = Object.entries(q.optionRemarks ?? {});
      if (remarkEntries.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Default Remarks:", bold: true })],
            indent: { left: 360 },
          }),
        );
        for (const [opt, remark] of remarkEntries) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${opt}: `, bold: true }),
                new TextRun({ text: String(remark) }),
              ],
              indent: { left: 720 },
            }),
          );
        }
      }
      children.push(new Paragraph({ text: "" }));
      qNum++;
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(
    blob,
    `${sanitize(template.name)}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

// ===== PDF Export (browser print) =====
export function exportTemplateAsPDF(template: Template): void {
  const win = window.open("", "_blank");
  if (!win) return;

  const green = "#96BB1A";
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(template.name)}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;color:#111;}
    h1{color:${green};border-bottom:2px solid ${green};padding-bottom:8px;}
    h2{color:#333;margin-top:24px;background:#f5f5f5;padding:6px 12px;border-left:4px solid ${green};}
    .q{margin:12px 0 6px 0;font-weight:bold;}
    .meta{color:#555;font-size:13px;margin-left:16px;}
    .options{color:#333;font-size:13px;margin-left:16px;}
    .remark{font-size:12px;color:#666;margin-left:32px;}
    @media print{body{padding:8px;}}
  </style></head><body>
  <h1>${escHtml(template.name)}</h1>
  <p style="color:#888;font-size:12px;">Exported: ${new Date().toLocaleString("en-IN")}</p>`;

  for (const section of template.sections) {
    html += `<h2>${escHtml(section.title)}</h2>`;
    let qNum = 1;
    for (const q of section.questions) {
      html += `<div class="q">Q${qNum}. ${escHtml(q.text)}</div>`;
      html += `<div class="options">Options: ${q.options.map(escHtml).join(", ")}</div>`;
      const flags = [
        q.required && "Mandatory",
        q.imageRequired && "Image Required",
      ].filter(Boolean);
      if (flags.length)
        html += `<div class="meta">Flags: ${flags.join(", ")}</div>`;
      const remarkEntries = Object.entries(q.optionRemarks ?? {});
      if (remarkEntries.length) {
        html += `<div class="meta">Default Remarks:</div>`;
        for (const [opt, remark] of remarkEntries) {
          html += `<div class="remark"><b>${escHtml(opt)}:</b> ${escHtml(String(remark))}</div>`;
        }
      }
      qNum++;
    }
  }

  html += "</body></html>";
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ===== Import =====
export interface ImportResult {
  success: boolean;
  template?: Template;
  error?: string;
}

export function parseTemplateJSON(jsonString: string): ImportResult {
  try {
    const obj = JSON.parse(jsonString);
    // Basic shape validation
    if (!obj.id || !obj.name || !Array.isArray(obj.sections)) {
      return {
        success: false,
        error:
          "Invalid template format. The file must be a valid SWiSH SAFE-T template JSON.",
      };
    }
    // Regenerate id + timestamps to avoid conflicts
    const imported: Template = {
      ...obj,
      id: `tmpl-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { success: true, template: imported };
  } catch {
    return {
      success: false,
      error: "Could not parse file. Make sure it is a valid JSON file.",
    };
  }
}

// ===== Helpers =====
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "_").trim() || "template";
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(
  data: string | Blob,
  filename: string,
  mime: string,
): void {
  const blob =
    typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
