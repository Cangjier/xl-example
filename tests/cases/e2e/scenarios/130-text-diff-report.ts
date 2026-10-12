// xl:title 文本对比报告：按行比较并统计
// xl:round 371
// xl:judge stdout
// xl:end
function splitLines(text: string): string[] { return text.split("\n"); }
function compare(a: string, b: string): { added: number; removed: number; same: number; rows: string[] } {
  const left = splitLines(a);
  const right = splitLines(b);
  const counts = new Map<string, number>();
  for (const line of left) counts.set(line, (counts.get(line) ?? 0) + 1);
  let added = 0;
  let removed = 0;
  let same = 0;
  const rows: string[] = [];
  const rightCounts = new Map<string, number>();
  for (const line of right) rightCounts.set(line, (rightCounts.get(line) ?? 0) + 1);
  for (const line of left) {
    const inRight = rightCounts.get(line) ?? 0;
    if (inRight > 0) { same += 1; rightCounts.set(line, inRight - 1); rows.push(" " + line); }
    else { removed += 1; rows.push("-" + line); }
  }
  for (const [line, n] of rightCounts) for (let i = 0; i < n; i++) { added += 1; rows.push("+" + line); }
  return { added, removed, same, rows };
}
const left = "alpha\nbeta\ngamma\ndelta";
const right = "alpha\ngamma\ngamma\nepsilon";
const r = compare(left, right);
console.log(r.added, r.removed, r.same);
for (const row of r.rows) console.log(row);
console.log(compare("same", "same").rows.length, compare("", "new").added);
