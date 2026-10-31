import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/auth";
import { reportFromParams } from "@/lib/report-data";
import { fmtDate } from "@/lib/format";

export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { report, f } = await reportFromParams(sp);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(report.title.slice(0, 31).replace(/[\\/?*[\]:]/g, "-"));
  ws.addRow([report.title]).font = { bold: true, size: 14 };
  ws.addRow([`${fmtDate(f.from)} to ${fmtDate(f.to)}`]);
  ws.addRow([]);
  const header = ws.addRow(report.columns.map((c) => c.label));
  header.font = { bold: true };
  // Cells are already formatted for display (₹, %), which is what the accountant reads.
  for (const r of report.rows) ws.addRow(r.cells.map((c) => c.v));
  ws.addRow(report.total.map((c) => c.v)).font = { bold: true };
  report.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(12, c.label.length + 4, ...report.rows.map((r) => r.cells[i].v.length + 2));
    if (c.num) col.alignment = { horizontal: "right" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const name = `${report.key}-report-${f.from}-to-${f.to}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
