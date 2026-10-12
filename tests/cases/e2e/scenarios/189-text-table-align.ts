// xl:title 文本表格：宽度计算 / 对齐 / 分隔线
// xl:round 653
// xl:judge stdout
// xl:end

const rows = [["id", "name"], ["1", "alice"], ["22", "bob"]];
const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
const line = widths.map((w) => "-".repeat(w + 2)).join("+");
const out: string[] = [line];
for (const r of rows) {
  out.push(r.map((cell, i) => " " + cell.padEnd(widths[i]) + " ").join("|"));
}
out.push(line);
console.log(out.join("\n"));
