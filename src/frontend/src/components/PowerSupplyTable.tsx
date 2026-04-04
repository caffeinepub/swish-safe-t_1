import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
import React from "react";
import type { PowerSupplyData, PowerSupplyRow } from "../types";

interface ColumnGroup {
  header: string;
  subCols: string[];
  labels?: string[];
}

function getPSConfig(type: PowerSupplyData["type"]): ColumnGroup[] {
  switch (type) {
    case "3in3out":
      return [
        { header: "Phase Voltage", subCols: ["RN", "YN", "BN"] },
        { header: "Line Voltage", subCols: ["RY", "YB", "BR"] },
        { header: "Current", subCols: ["R", "Y", "B", "N"] },
        { header: "Earthing", subCols: ["RE", "YE", "BE", "NE"] },
      ];
    case "3in1out":
      return [
        { header: "Input Voltage", subCols: ["RN", "YN", "BN"] },
        { header: "Earthing", subCols: ["RE", "YE", "BE", "NE"] },
        { header: "Input Current", subCols: ["R", "Y", "B", "N"] },
        {
          header: "Output",
          subCols: ["PE", "NE_out", "P_out", "N_out"],
          labels: ["PE", "NE", "P", "N"],
        },
      ];
    case "1in1out":
      return [
        {
          header: "Input Voltage",
          subCols: ["PN", "PN2", "NE"],
          labels: ["PN", "PN", "NE"],
        },
        {
          header: "Input Current",
          subCols: ["P_in", "N_in"],
          labels: ["P", "N"],
        },
        {
          header: "Output Voltage",
          subCols: ["PN_out", "PN2_out", "NE_out"],
          labels: ["PN", "PN", "NE"],
        },
        {
          header: "Output Current",
          subCols: ["P_out", "N_out"],
          labels: ["P", "N"],
        },
      ];
  }
}

// Export for use in exportExcel.ts and exportWord.ts
export { getPSConfig };
export type { ColumnGroup };

function makeRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface PowerSupplyTableProps {
  sectionId: string;
  data: PowerSupplyData;
  onChange: (sectionId: string, data: PowerSupplyData) => void;
  readOnly?: boolean;
}

export function PowerSupplyTable({
  sectionId,
  data,
  onChange,
  readOnly = false,
}: PowerSupplyTableProps) {
  const config = getPSConfig(data.type);
  const totalCols = config.reduce((sum, g) => sum + g.subCols.length, 0);

  const addRow = () => {
    const newRow: PowerSupplyRow = {
      id: makeRowId(),
      circuitName: "",
      values: {},
    };
    onChange(sectionId, { ...data, rows: [...data.rows, newRow] });
  };

  const removeRow = (rowId: string) => {
    const rows = data.rows.filter((r) => r.id !== rowId);
    onChange(sectionId, { ...data, rows });
  };

  const updateCircuitName = (rowId: string, value: string) => {
    const rows = data.rows.map((row) =>
      row.id === rowId ? { ...row, circuitName: value } : row,
    );
    onChange(sectionId, { ...data, rows });
  };

  const updateValue = (rowId: string, colKey: string, value: string) => {
    const rows = data.rows.map((row) =>
      row.id === rowId
        ? { ...row, values: { ...row.values, [colKey]: value } }
        : row,
    );
    onChange(sectionId, { ...data, rows });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            {/* Group header row */}
            <tr className="bg-[#96BB1A]/10">
              {/* Circuit Name header spans 2 rows */}
              <th
                rowSpan={2}
                className="border border-border px-3 py-2 text-left font-semibold text-xs whitespace-nowrap min-w-[130px] bg-[#96BB1A]/20"
              >
                Circuit Name
              </th>
              {config.map((group) => (
                <th
                  key={group.header}
                  colSpan={group.subCols.length}
                  className="border border-border px-2 py-1.5 text-center font-semibold text-xs text-gray-700 border-b-2 border-b-[#96BB1A]"
                >
                  {group.header}
                </th>
              ))}
              {!readOnly && (
                <th
                  rowSpan={2}
                  className="border border-border px-2 py-1 text-center font-semibold text-xs w-8"
                />
              )}
            </tr>
            {/* Sub-column header row */}
            <tr className="bg-[#96BB1A]/5">
              {config.map((group) =>
                group.subCols.map((col, ci) => (
                  <th
                    key={`${group.header}-${col}`}
                    className="border border-border px-1 py-1 text-center font-medium text-[10px] text-gray-600 min-w-[70px]"
                  >
                    {group.labels ? group.labels[ci] : col}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols + 2}
                  className="border border-border px-4 py-6 text-center text-xs text-muted-foreground"
                  data-ocid="power_supply.empty_state"
                >
                  No rows yet. Click &ldquo;Add Row&rdquo; to add measurements.
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className="hover:bg-muted/20 transition-colors"
                  data-ocid={`power_supply.row.${idx + 1}`}
                >
                  <td className="border border-border px-1 py-1">
                    <input
                      type="text"
                      value={row.circuitName}
                      onChange={(e) =>
                        updateCircuitName(row.id ?? String(idx), e.target.value)
                      }
                      placeholder="Circuit name"
                      readOnly={readOnly}
                      className="w-full min-w-[120px] px-2 py-1 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-[#96BB1A] disabled:opacity-60"
                      data-ocid="power_supply.input"
                    />
                  </td>
                  {config.map((group) =>
                    group.subCols.map((col) => (
                      <td
                        key={`${group.header}-${col}`}
                        className="border border-border px-1 py-1"
                      >
                        <input
                          type="number"
                          value={row.values[col] ?? ""}
                          onChange={(e) =>
                            updateValue(
                              row.id ?? String(idx),
                              col,
                              e.target.value,
                            )
                          }
                          placeholder="0"
                          readOnly={readOnly}
                          className="w-full min-w-[65px] px-2 py-1 text-xs border border-input rounded bg-background text-center focus:outline-none focus:ring-1 focus:ring-[#96BB1A] disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-ocid="power_supply.input"
                        />
                      </td>
                    )),
                  )}
                  {!readOnly && (
                    <td className="border border-border px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id ?? String(idx))}
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                        title="Remove row"
                        data-ocid={`power_supply.delete_button.${idx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="text-xs border-[#96BB1A] text-[#96BB1A] hover:bg-[#96BB1A]/10 hover:text-[#96BB1A]"
          data-ocid="power_supply.button"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Add Row
        </Button>
      )}
    </div>
  );
}
