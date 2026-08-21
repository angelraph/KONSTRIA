import ExcelJS from "exceljs";
import { groupByStage, type BOQSnapshotExport } from "@konstria/shared-types";

const CURRENCY_FORMAT = '#,##0.00';

/**
 * Builds one workbook per BOQSnapshot: a Summary sheet with stage subtotals
 * and grand total, plus one sheet per stage with live SUM formulas so a
 * client can hand-verify the numbers rather than trusting an opaque total.
 */
export async function generateBoqWorkbook(snapshot: BOQSnapshotExport): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KONSTRIA";
  workbook.created = new Date(snapshot.generatedAt);

  const grouped = groupByStage(snapshot);

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Stage", key: "stage", width: 28 },
    { header: `Subtotal (${snapshot.currency})`, key: "subtotal", width: 20 },
  ];
  for (const group of grouped) {
    summary.addRow({ stage: group.stage, subtotal: group.subtotal });
  }
  const totalRowIndex = grouped.length + 2; // header row + one per stage + 1
  summary.getCell(`A${totalRowIndex}`).value = "Grand Total";
  summary.getCell(`A${totalRowIndex}`).font = { bold: true };
  summary.getCell(`B${totalRowIndex}`).value = { formula: `SUM(B2:B${totalRowIndex - 1})` };
  summary.getCell(`B${totalRowIndex}`).font = { bold: true };
  summary.getColumn("subtotal").numFmt = CURRENCY_FORMAT;

  summary.addRow([]);
  summary.addRow(["Project", snapshot.projectName]);
  summary.addRow(["Region", snapshot.region]);
  summary.addRow(["Generated", snapshot.generatedAt]);
  summary.addRow(["Rule engine version", snapshot.ruleEngineVersion]);

  for (const group of grouped) {
    // Sheet names are capped at 31 chars and can't contain []*?:/\\.
    const sheetName = group.stage.slice(0, 31).replace(/[\[\]*?:/\\]/g, "-");
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: "Description", key: "description", width: 40 },
      { header: "Qty", key: "quantity", width: 12 },
      { header: "Unit", key: "unit", width: 10 },
      { header: `Rate (${snapshot.currency})`, key: "unitRate", width: 16 },
      { header: `Amount (${snapshot.currency})`, key: "amount", width: 18 },
      { header: "Source", key: "provenanceLabel", width: 30 },
      { header: "As of", key: "asOfDate", width: 14 },
    ];
    for (const item of group.lineItems) {
      sheet.addRow({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitRate: item.unitRate,
        amount: item.amount,
        provenanceLabel: item.provenanceLabel,
        asOfDate: item.asOfDate ?? "",
      });
    }
    const lastRow = group.lineItems.length + 1;
    const totalRow = sheet.addRow({ description: "Stage total" });
    totalRow.getCell("amount").value = { formula: `SUM(E2:E${lastRow})` };
    totalRow.font = { bold: true };
    sheet.getColumn("unitRate").numFmt = CURRENCY_FORMAT;
    sheet.getColumn("amount").numFmt = CURRENCY_FORMAT;
  }

  return workbook;
}

export async function generateBoqWorkbookBuffer(snapshot: BOQSnapshotExport): Promise<Buffer> {
  const workbook = await generateBoqWorkbook(snapshot);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
