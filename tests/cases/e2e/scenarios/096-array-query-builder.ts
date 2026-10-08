// xl:title 数组上的类 SQL 查询：where / orderBy / groupBy / select
// xl:round 371
// xl:judge stdout
// xl:end
type Row = { dept: string; name: string; salary: number };
const rows: Row[] = [
  { dept: "eng", name: "ann", salary: 120 },
  { dept: "eng", name: "bob", salary: 90 },
  { dept: "ops", name: "cid", salary: 100 },
  { dept: "ops", name: "dee", salary: 95 },
  { dept: "sales", name: "eve", salary: 80 },
];
class Query {
  private data: Row[];
  constructor(data: Row[]) { this.data = data.slice(); }
  where(pred: (r: Row) => boolean): Query { return new Query(this.data.filter(pred)); }
  orderBy(key: (r: Row) => number | string, dir: "asc" | "desc" = "asc"): Query {
    const sign = dir === "desc" ? -1 : 1;
    const sorted = this.data.slice().sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (typeof ka === "number" && typeof kb === "number") return (ka - kb) * sign;
      return String(ka).localeCompare(String(kb)) * sign;
    });
    return new Query(sorted);
  }
  select<T>(map: (r: Row) => T): T[] { return this.data.map(map); }
  groupBy<T>(key: (r: Row) => string, agg: (rs: Row[]) => T): Record<string, T> {
    const groups: Record<string, Row[]> = {};
    for (const r of this.data) {
      const k = key(r);
      groups[k] = groups[k] ?? [];
      groups[k].push(r);
    }
    const out: Record<string, T> = {};
    for (const k of Object.keys(groups)) out[k] = agg(groups[k]);
    return out;
  }
  count(): number { return this.data.length; }
}
const q = new Query(rows);
console.log(q.where((r) => r.salary >= 95).count());
console.log(q.orderBy((r) => r.salary, "desc").select((r) => r.name).join(","));
const byDept = q.groupBy((r) => r.dept, (rs) => rs.reduce((a, b) => a + b.salary, 0));
console.log(JSON.stringify(byDept));
console.log(Object.keys(byDept).sort().join(","), q.where((r) => r.dept === "eng").count());
