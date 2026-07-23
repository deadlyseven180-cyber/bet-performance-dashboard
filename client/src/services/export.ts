import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Bet } from '@/types';
import type { Kpis } from './analytics';
import { formatDate, money, percent } from '@/utils/format';

/**
 * Report export service. Exports always operate on the ALREADY-FILTERED bets
 * passed in, so every report respects the currently selected filters.
 */

function betRows(bets: Bet[]): Record<string, string | number>[] {
  return bets.map((b) => ({
    Date: b.date ?? '',
    Service: b.service,
    Account: b.account,
    'Bet Platform': b.betPlatform,
    Sport: b.sport,
    League: b.league,
    Event: b.event,
    'Bet Type': b.betType,
    Selection: b.selection,
    Stake: b.stake,
    Odds: b.odds,
    Status: b.status,
    'Return Amount': b.returnAmount,
    Profit: b.profit,
    Notes: b.notes,
  }));
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function exportCsv(bets: Bet[]): void {
  const csv = Papa.unparse(betRows(bets));
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `bets-${stamp()}.csv`);
}

export function exportExcel(bets: Bet[], kpis: Kpis): void {
  const wb = XLSX.utils.book_new();

  const summary = [
    ['Metric', 'Value'],
    ['Total Bets', kpis.totalBets],
    ['Won', kpis.won],
    ['Lost', kpis.lost],
    ['Void', kpis.void],
    ['Pending', kpis.pending],
    ['Win Rate %', kpis.winRate.toFixed(2)],
    ['Total Stake', kpis.totalStake.toFixed(2)],
    ['Total Returns', kpis.totalReturns.toFixed(2)],
    ['Net Profit', kpis.netProfit.toFixed(2)],
    ['ROI %', kpis.roi.toFixed(2)],
    ['Average Odds', kpis.avgOdds.toFixed(2)],
    ['Average Stake', kpis.avgStake.toFixed(2)],
    ['Largest Win', kpis.largestWin.toFixed(2)],
    ['Largest Loss', kpis.largestLoss.toFixed(2)],
    ['Longest Win Streak', kpis.longestWinStreak],
    ['Longest Loss Streak', kpis.longestLossStreak],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(betRows(bets)), 'Bets');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), `bet-report-${stamp()}.xlsx`);
}

export function exportPdf(bets: Bet[], kpis: Kpis): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  const now = new Date().toLocaleString('en-AU');

  doc.setFontSize(18);
  doc.text('Bet Performance Report', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${now}  •  ${bets.length} bets (filtered)`, 40, 58);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 74,
    head: [['Net Profit', 'ROI', 'Win Rate', 'Total Stake', 'Total Returns', 'Avg Odds']],
    body: [[
      money(kpis.netProfit), percent(kpis.roi), percent(kpis.winRate),
      money(kpis.totalStake), money(kpis.totalReturns), kpis.avgOdds.toFixed(2),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [37, 68, 235] },
    styles: { fontSize: 10 },
  });

  const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY,
    head: [['Date', 'Service', 'Platform', 'Sport', 'Event', 'Selection', 'Stake', 'Odds', 'Status', 'Profit']],
    body: bets.slice(0, 400).map((b) => [
      formatDate(b.date), b.service, b.betPlatform, b.sport,
      b.event, b.selection, money(b.stake), b.odds ? b.odds.toFixed(2) : '—',
      b.status, money(b.profit),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 68, 235] },
    styles: { fontSize: 7, cellPadding: 3 },
    columnStyles: { 9: { halign: 'right' }, 6: { halign: 'right' } },
  });

  if (bets.length > 400) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Showing first 400 of ${bets.length} bets. Use Excel/CSV export for the full dataset.`, 40, y);
  }

  doc.save(`bet-report-${stamp()}.pdf`);
}
