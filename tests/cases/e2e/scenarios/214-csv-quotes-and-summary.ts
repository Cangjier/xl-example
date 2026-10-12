// xl:title 端到端：CSV 解析（引号 / 转义 / 空字段）+ 分组汇总
// xl:round 7
// xl:judge stdout
// xl:end

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}
const csv = 'name,qty,note\nab,2,"a, b"\n"cd",3,"say ""hi"""\n,,""\n';
const rows = parseCsv(csv).filter((r) => r.some((c) => c !== ""));
console.log(rows.length, rows[1][2], rows[2][2]);
const totals = new Map<string, number>();
for (const r of rows.slice(1)) totals.set(r[0] || "(none)", (totals.get(r[0] || "(none)") ?? 0) + Number(r[1] || 0));
console.log([...totals.entries()].sort().map(([k, v]) => k + ":" + v).join("|"));
