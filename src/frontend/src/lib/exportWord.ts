import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { getPSConfig } from "../components/PowerSupplyTable";
import type { Audit, CriticalObservation, PowerSupplyData } from "../types";
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

function makeParagraph(
  text: string,
  bold = false,
  heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph {
  return new Paragraph({
    heading: heading,
    children: [
      new TextRun({
        text,
        bold,
        size: heading ? 28 : 22,
      }),
    ],
    alignment: AlignmentType.LEFT,
    spacing: { after: 120 },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 18 })],
            }),
          ],
          shading: { fill: "E8F0C0" },
          width: {
            size: Math.floor(9000 / headers.length),
            type: WidthType.DXA,
          },
        }),
    ),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell ?? "", size: 18 })],
                }),
              ],
              width: {
                size: Math.floor(9000 / row.length),
                type: WidthType.DXA,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "DADDE1" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "DADDE1" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "DADDE1" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "DADDE1" },
              },
            }),
        ),
      }),
  );

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  });
}

async function dataUrlToUint8Array(
  dataUrl: string,
): Promise<Uint8Array | null> {
  try {
    const res = await fetch(dataUrl);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function exportAuditToWord(
  audit: Audit,
  template: Template,
  site: Site,
  client: Client,
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Cover page
  children.push(makeParagraph("SWiSH SAFE-T", true, HeadingLevel.HEADING_1));
  children.push(
    makeParagraph("Safety Inspection Report", true, HeadingLevel.HEADING_2),
  );
  children.push(new Paragraph({ spacing: { after: 200 } }));
  children.push(makeParagraph(`Client: ${client.name}`, false));
  children.push(makeParagraph(`Site: ${site.name}`, false));
  children.push(makeParagraph(`Address: ${site.address ?? ""}`, false));
  children.push(makeParagraph(`Template: ${template.name}`, false));
  children.push(makeParagraph(`Status: ${audit.status}`, false));
  children.push(
    makeParagraph(`Inspection Date: ${formatDate(audit.updatedAt)}`, false),
  );
  children.push(makeParagraph(`Inspector: ${audit.submittedBy ?? ""}`, false));
  if (audit.approvedBy) {
    children.push(makeParagraph(`Approved By: ${audit.approvedBy}`, false));
  }
  if (audit.rejectionNote) {
    children.push(new Paragraph({ spacing: { after: 120 } }));
    children.push(makeParagraph("Rejection Note:", true));
    children.push(makeParagraph(audit.rejectionNote, false));
  }
  children.push(new Paragraph({ pageBreakBefore: true }));

  // Sections
  for (const section of template.sections) {
    children.push(makeParagraph(section.title, true, HeadingLevel.HEADING_2));

    // Questions table
    const questionRows: string[][] = section.questions.map((q, i) => {
      const ans = audit.answers[q.id] ?? {
        answer: "",
        remarks: "",
        images: [],
      };
      return [String(i + 1), q.text, ans.answer, ans.remarks];
    });

    if (questionRows.length > 0) {
      children.push(
        makeTable(["#", "Question", "Answer", "Remarks"], questionRows),
      );
    }

    // Critical observations
    const obs: CriticalObservation[] = audit.observations[section.id] ?? [];
    if (section.hasCriticalObservations && obs.length > 0) {
      children.push(new Paragraph({ spacing: { after: 160 } }));
      children.push(
        makeParagraph("Critical Observations", true, HeadingLevel.HEADING_3),
      );
      const obsRows = obs.map((o, i) => [
        String(i + 1),
        o.remarks,
        o.recommendations,
      ]);
      children.push(makeTable(["#", "Remarks", "Recommendations"], obsRows));
    }

    // Power supply
    const ps: PowerSupplyData | undefined = audit.powerSupply[section.id];
    if (section.hasPowerSupply && ps && ps.rows.length > 0) {
      children.push(new Paragraph({ spacing: { after: 160 } }));
      children.push(
        makeParagraph("Power Supply Details", true, HeadingLevel.HEADING_3),
      );
      children.push(makeParagraph(`Configuration: ${ps.type}`, false));
      const psConfig = getPSConfig(ps.type);
      const psHeaders = [
        "Circuit Name",
        ...psConfig.flatMap((g) => g.labels ?? g.subCols),
      ];
      const psDataRows = ps.rows.map((row) => [
        row.circuitName,
        ...psConfig.flatMap((g) =>
          (g.labels ?? g.subCols).map((_, i) => row.values[g.subCols[i]] ?? ""),
        ),
      ]);
      children.push(makeTable(psHeaders, psDataRows));
    }

    children.push(new Paragraph({ spacing: { after: 300 } }));
  }

  // Photo pages
  const allPhotos: { dataUrl: string; caption: string }[] = [];
  for (const section of template.sections) {
    for (const q of section.questions) {
      const ans = audit.answers[q.id];
      if (ans?.images) {
        for (const img of ans.images) {
          allPhotos.push({
            dataUrl: img,
            caption: `${section.title}: ${q.text}`,
          });
        }
      }
    }
  }

  if (allPhotos.length > 0) {
    children.push(new Paragraph({ pageBreakBefore: true }));
    children.push(makeParagraph("Photographs", true, HeadingLevel.HEADING_2));

    // Process in groups of 3
    for (let i = 0; i < allPhotos.length; i++) {
      const photo = allPhotos[i];
      try {
        const bytes = await dataUrlToUint8Array(photo.dataUrl);
        if (bytes) {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width: 200, height: 150 },
                  type: "jpg",
                }),
              ],
              spacing: { after: 80 },
            }),
          );
          children.push(makeParagraph(photo.caption, false));
        }
      } catch {
        // Skip images that fail
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-${site.name.replace(/\s+/g, "-")}-${formatDate(audit.updatedAt)}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
