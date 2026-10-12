// xl:title 端到端：词频统计 + 排序输出（Map / 数组 / 字符串归一）
// xl:round 7
// xl:judge stdout
// xl:want blocked
// xl:why 同上：正则切分那一版。**必做**
// xl:end

const text = "the quick brown fox jumps over the lazy dog The DOG barks";
const counts = new Map<string, number>();
for (const raw of text.split(/\s+/)) {
  const w = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (w === "") continue;
  counts.set(w, (counts.get(w) ?? 0) + 1);
}
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
console.log(rows.length, rows.map(([w, n]) => w + ":" + n).join(" "));
const once = rows.filter(([, n]) => n === 1).map(([w]) => w);
console.log("once=" + once.join(","));
console.log("has-dog=" + counts.has("dog"), "has-cat=" + counts.has("cat"));
