// xl:title 透视表：行维度 × 列维度 × 聚合
// xl:round 371
// xl:judge stdout
// xl:end
type Sale = { region: string; quarter: string; amount: number };
const sales: Sale[] = [
  { region: "north", quarter: "Q1", amount: 10 },
  { region: "north", quarter: "Q2", amount: 20 },
  { region: "south", quarter: "Q1", amount: 5 },
  { region: "south", quarter: "Q2", amount: 7 },
  { region: "north", quarter: "Q1", amount: 3 },
];
function pivot(rows: Sale[], rowKey: (s: Sale) => string, colKey: (s: Sale) => string, value: (s: Sale) => number, agg: (xs: number[]) => number): string[][] {
  const rowNames = [...new Set(rows.map(rowKey))].sort();
  const colNames = [...new Set(rows.map(colKey))].sort();
  const table: string[][] = [[""].concat(colNames, ["total"])];
  for (const r of rowNames) {
    const line: string[] = [r];
    let rowTotal = 0;
    for (const c of colNames) {
      const cell = rows.filter((s) => rowKey(s) === r && colKey(s) === c).map(value);
      const v = cell.length === 0 ? 0 : agg(cell);
      rowTotal += v;
      line.push(String(v));
    }
    line.push(String(rowTotal));
    table.push(line);
  }
  const footer: string[] = ["total"];
  let grand = 0;
  for (const c of colNames) {
    const v = agg(rows.filter((s) => colKey(s) === c).map(value));
    grand += v;
    footer.push(String(v));
  }
  footer.push(String(grand));
  table.push(footer);
  return table;
}
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const table = pivot(sales, (s) => s.region, (s) => s.quarter, (s) => s.amount, sum);
for (const row of table) console.log(row.map((c) => c.padEnd(7)).join(""));
console.log(table.length, table[0].length);
const avg = (xs: number[]): number => Math.round(sum(xs) / xs.length);
console.log(pivot(sales, (s) => s.region, (s) => s.quarter, (s) => s.amount, avg)[1].join(","));
