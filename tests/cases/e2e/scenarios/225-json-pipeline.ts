// xl:title 完整程序：解析 → 过滤 → 聚合 → 排序 → 输出
// xl:round 9
// xl:judge stdout
// xl:end

const raw = '[{"name":"a","score":3,"tags":["x"]},{"name":"b","score":1,"tags":[]},{"name":"c","score":3,"tags":["y","x"]}]';
const rows = JSON.parse(raw) as { name: string; score: number; tags: string[] }[];
const withTags = rows.filter((r) => r.tags.length > 0);
const byScore = new Map<number, string[]>();
for (const r of withTags) {
  const list = byScore.get(r.score) ?? [];
  list.push(r.name);
  byScore.set(r.score, list);
}
const ranked = [...byScore.entries()].sort((x, y) => y[0] - x[0]);
for (const [score, names] of ranked) console.log(score + ": " + names.sort().join(","));
console.log("total", rows.reduce((p, c) => p + c.score, 0));
