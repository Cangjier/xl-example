// xl:title 端到端：CSV 解析状态机（引号、转义引号、换行、字段数不一致）
// xl:round 7
// xl:judge stdout
// xl:end

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
const data = 'a,b,c\n1,"x,y",3\n"he said ""hi""",2,\n';
const rows = parseCsv(data);
console.log(rows.length);
for (const r of rows) console.log(r.length + "|" + r.join("/"));
const widths = new Set(rows.map((r) => r.length));
console.log("ragged=" + (widths.size > 1), [...widths].join(","));
