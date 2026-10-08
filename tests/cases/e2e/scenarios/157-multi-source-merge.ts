// xl:title 多来源合并：去重、优先级、冲突报告
// xl:round 371
// xl:judge stdout
// xl:end
type Rec = { id: string; value: number; source: string };
const sources: { name: string; priority: number; rows: Rec[] }[] = [
  { name: "cache", priority: 1, rows: [{ id: "a", value: 1, source: "cache" }, { id: "b", value: 2, source: "cache" }] },
  { name: "db", priority: 3, rows: [{ id: "b", value: 20, source: "db" }, { id: "c", value: 30, source: "db" }] },
  { name: "api", priority: 2, rows: [{ id: "a", value: 10, source: "api" }, { id: "d", value: 40, source: "api" }] },
];
const merged = new Map<string, Rec>();
const conflicts: string[] = [];
for (const source of sources.slice().sort((a, b) => a.priority - b.priority)) {
  for (const row of source.rows) {
    const existing = merged.get(row.id);
    if (existing && existing.value !== row.value) conflicts.push(row.id + ":" + existing.value + "->" + row.value);
    if (!existing || source.priority >= sources.find((s) => s.rows.some((r) => r.id === existing.id))!.priority) {
      merged.set(row.id, row);
    }
  }
}
console.log([...merged.values()].sort((a, b) => a.id.localeCompare(b.id)).map((r) => r.id + "=" + r.value + "@" + r.source).join(","));
console.log(conflicts.join("|"));
console.log(merged.size, sources.reduce((a, b) => a + b.rows.length, 0));
const winners = new Map<string, number>();
for (const s of sources) for (const r of s.rows) winners.set(r.id, (winners.get(r.id) ?? 0) + 1);
console.log([...winners.entries()].map(([k, v]) => k + ":" + v).join(","));
