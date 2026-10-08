// xl:title 分页 + 过滤 + 排序的查询管线
// xl:round 371
// xl:judge stdout
// xl:end
type Item = { id: number; name: string; score: number; tag: string };
const items: Item[] = [];
for (let i = 1; i <= 25; i++) items.push({ id: i, name: "item" + String(i).padStart(2, "0"), score: (i * 7) % 13, tag: i % 3 === 0 ? "c" : i % 2 === 0 ? "b" : "a" });
type Query = { tag?: string; minScore?: number; sort?: "id" | "score" | "name"; dir?: "asc" | "desc"; page?: number; size?: number };
function run(items: Item[], q: Query): { rows: Item[]; total: number; pages: number } {
  let rows = items.filter((i) => (q.tag === undefined || i.tag === q.tag) && (q.minScore === undefined || i.score >= q.minScore));
  const key = q.sort ?? "id";
  const sign = q.dir === "desc" ? -1 : 1;
  rows = rows.slice().sort((a, b) => {
    const ka = key === "name" ? a.name : a[key];
    const kb = key === "name" ? b.name : b[key];
    if (typeof ka === "string" && typeof kb === "string") return ka.localeCompare(kb) * sign;
    return ((ka as number) - (kb as number)) * sign;
  });
  const size = q.size ?? 5;
  const page = Math.max(1, q.page ?? 1);
  const start = (page - 1) * size;
  return { rows: rows.slice(start, start + size), total: rows.length, pages: Math.ceil(rows.length / size) };
}
const r1 = run(items, {});
console.log(r1.total, r1.pages, r1.rows.map((i) => i.id).join(","));
const r2 = run(items, { tag: "a", sort: "score", dir: "desc", page: 2, size: 3 });
console.log(r2.total, r2.rows.map((i) => i.id + ":" + i.score).join(","));
const r3 = run(items, { minScore: 10, sort: "name", dir: "desc", size: 4 });
console.log(r3.total, r3.rows.map((i) => i.name).join(","));
console.log(run(items, { page: 99 }).rows.length, run(items, { tag: "zzz" }).pages);
