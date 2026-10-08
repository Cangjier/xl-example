// xl:title CSV 解析（带引号与转义）与写回
// xl:round 371
// xl:judge stdout
// xl:end
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((f) => {
    const needsQuote = f.includes(",") || f.includes('"') || f.includes("\n");
    return needsQuote ? '"' + f.split('"').join('""') + '"' : f;
  }).join(",")).join("\n");
}
const raw = 'name,note\n"ann","likes \"quotes\""\nbob,"a,b"\n"" ,empty';
const rows = parseCsv(raw);
console.log(rows.length, rows[0].join("|"));
for (const row of rows.slice(1)) console.log(row.length, JSON.stringify(row));
const roundTrip = toCsv(rows);
console.log(parseCsv(roundTrip).length, parseCsv(roundTrip)[1][1]);
console.log(toCsv([["a", "b,c"]].concat([['say "hi"']])));
