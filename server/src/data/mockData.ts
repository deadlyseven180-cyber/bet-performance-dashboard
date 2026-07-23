/**
 * Deterministic mock dataset. Produced as raw rows (header + data) so it flows
 * through the exact same normalization pipeline as real Google Sheets data.
 * Some rows intentionally omit Status/Profit so win/loss inference is exercised.
 */

const SERVICES = ['Sharp Alerts', 'Value Kings', 'InsideEdge', 'MidfieldTips', 'ClosingLine', 'GrindPro'];
const ACCOUNTS = ['Main', 'Alt-01', 'Alt-02', 'Betfair-A', 'Syndicate'];
const PLATFORMS = ['Sportsbet', 'Bet365', 'TAB', 'Ladbrokes', 'Neds', 'PointsBet', 'Betfair'];
const SPORTS = ['NBA', 'NRL', 'AFL', 'MLB', 'Soccer', 'Tennis', 'Cricket', 'Horse Racing'];
const LEAGUES: Record<string, string[]> = {
  NBA: ['NBA'], NRL: ['NRL'], AFL: ['AFL'], MLB: ['MLB'],
  Soccer: ['EPL', 'A-League', 'La Liga', 'UCL'], Tennis: ['ATP', 'WTA'],
  Cricket: ['BBL', 'Test'], 'Horse Racing': ['Randwick', 'Flemington', 'Rosehill'],
};
const BET_TYPES = ['Moneyline', 'Spread', 'Handicap', 'Over', 'Under', 'Same Game Multi', 'Parlay'];

// A tiny seeded PRNG so the dataset is identical on every run.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260722);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);

const HEADERS = [
  'Date', 'Service', 'Account', 'Bet Platform', 'Sport', 'League', 'Event',
  'Bet Type', 'Selection', 'Stake', 'Odds', 'Status', 'Return Amount', 'Profit', 'Notes',
];

function buildRows(): string[][] {
  const rows: string[][] = [HEADERS];
  const start = new Date(Date.UTC(2026, 0, 1)); // 1 Jan 2026
  const totalDays = 200;

  for (let i = 0; i < 260; i++) {
    const dayOffset = Math.floor(rand() * totalDays);
    const d = new Date(start.getTime() + dayOffset * 86400000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`; // Australian format

    const sport = pick(SPORTS);
    const league = pick(LEAGUES[sport]);
    const service = pick(SERVICES);
    const betType = pick(BET_TYPES);
    const stake = Math.round(between(20, 500) * 100) / 100;
    const odds = Math.round(between(1.4, betType === 'Parlay' || betType === 'Same Game Multi' ? 12 : 4.5) * 100) / 100;

    // Give services distinct edges so rankings show a realistic spread of
    // winners and losers (and the demo is net-profitable overall).
    const edge = { 'Sharp Alerts': 0.15, 'Value Kings': 0.11, InsideEdge: 0.08, MidfieldTips: 0.04, ClosingLine: 0.06, GrindPro: -0.02 }[service] ?? 0.05;
    const roll = rand();
    const impliedWin = 1 / odds + edge;

    let status = '', returnAmount = '', profit = '';
    if (dayOffset > totalDays - 12) {
      status = 'Pending'; // recent bets still open
    } else if (roll < 0.045) {
      status = 'Void';
      returnAmount = stake.toFixed(2);
      profit = '0';
    } else if (roll < impliedWin) {
      status = 'Won';
      const ret = stake * odds;
      returnAmount = ret.toFixed(2);
      profit = (ret - stake).toFixed(2);
    } else {
      status = 'Lost';
      returnAmount = '0';
      profit = (-stake).toFixed(2);
    }

    // Exercise win/loss inference: drop Status on ~1/9 settled rows,
    // and drop Profit on another slice so it must be derived.
    if (status !== 'Pending' && i % 9 === 0) status = '';
    if (status === 'Won' && i % 13 === 0) profit = '';

    rows.push([
      dateStr, service, pick(ACCOUNTS), pick(PLATFORMS), sport, league,
      `${sport} Match ${i + 1}`, betType, `Selection ${i + 1}`,
      stake.toFixed(2), odds.toFixed(2), status, returnAmount, profit,
      rand() < 0.15 ? 'Chased closing line' : '',
    ]);
  }
  return rows;
}

export const mockRows: string[][] = buildRows();

export const mockMeta = {
  spreadsheetId: 'mock-spreadsheet',
  spreadsheetTitle: 'Sample Betting Log (Demo Data)',
  worksheet: 'Sheet1',
  worksheets: ['Sheet1', 'Archive 2025'],
};
