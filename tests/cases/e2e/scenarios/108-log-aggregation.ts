// xl:title 日志解析与聚合：级别、耗时、热点
// xl:round 371
// xl:judge stdout
// xl:end
const raw = [
  "2024-01-01T10:00:00 INFO  request id=1 ms=120 path=/a",
  "2024-01-01T10:00:01 WARN  request id=2 ms=350 path=/b",
  "2024-01-01T10:00:02 ERROR request id=3 ms=900 path=/a",
  "2024-01-01T10:00:03 INFO  request id=4 ms=80 path=/c",
  "malformed line without structure",
];
type Entry = { level: string; ms: number; path: string };
function parse(line: string): Entry | null {
  const parts = line.split(" ");
  if (parts.length < 6) return null;
  const level = parts[1];
  let ms = 0;
  let path = "";
  for (const p of parts) {
    if (p.startsWith("ms=")) ms = Number(p.slice(3));
    if (p.startsWith("path=")) path = p.slice(5);
  }
  return { level, ms, path };
}
const entries: Entry[] = [];
let bad = 0;
for (const line of raw) {
  const e = parse(line);
  if (e === null) bad += 1;
  else entries.push(e);
}
console.log(entries.length, bad);
const byLevel: Record<string, number> = {};
for (const e of entries) byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
console.log(JSON.stringify(byLevel));
const byPath = new Map<string, number[]>();
for (const e of entries) {
  const list = byPath.get(e.path) ?? [];
  list.push(e.ms);
  byPath.set(e.path, list);
}
const slowest = [...byPath.entries()].map(([p, list]) => ({
  path: p,
  avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
  max: Math.max(...list),
})).sort((a, b) => b.avg - a.avg);
for (const s of slowest) console.log(s.path, s.avg, s.max);
console.log(entries.reduce((a, b) => a + b.ms, 0));
