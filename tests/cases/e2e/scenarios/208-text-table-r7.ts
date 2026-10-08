// xl:title 端到端：对象数组渲染成对齐的文本表（列宽 + 缺列 + 数字右对齐）
// xl:round 7
// xl:judge stdout
// xl:end

function table(rows: Array<Record<string, any>>, columns: Array<{ key: string; align?: "l" | "r" }>): string[] {
  const cells = rows.map((r) => columns.map((c) => (r[c.key] === undefined ? "" : String(r[c.key]))));
  const widths = columns.map((c, i) => Math.max(c.key.length, ...cells.map((r) => r[i].length)));
  const pad = (s: string, w: number, a?: string) => (a === "r" ? s.padStart(w) : s.padEnd(w));
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const line = (vals: string[]) => "| " + vals.map((v, i) => pad(v, widths[i])).join(" | ") + " |";
  return [sep, line(columns.map((c) => c.key)), sep, ...cells.map(line), sep];
}
const rows = [{ name: "ab", qty: 3 }, { name: "longer", qty: 42 }, { name: "x" }];
console.log(table(rows, [{ key: "name" }, { key: "qty", align: "r" }]).join("\n"));
console.log(table([], [{ key: "a" }]).length);
