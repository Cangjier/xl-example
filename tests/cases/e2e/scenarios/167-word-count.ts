// xl:title 端到端：分词统计（Map + sort + 模板串）
// xl:round 623
// xl:judge stdout
// xl:end

const text = "the quick brown fox the lazy dog the";
const counts = new Map<string, number>();
for (const w of text.split(" ")) counts.set(w, (counts.get(w) ?? 0) + 1);
const rows = [...counts.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
for (const [w, n] of rows) console.log(`${w}:${n}`);
