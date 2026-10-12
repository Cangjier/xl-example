// xl:title 词频：`Map` + 排序 + 大小写归一
// xl:round 305
// xl:judge stdout
// xl:end

const text = "the quick brown fox jumps over the lazy dog the fox";
const counts = new Map<string, number>();
for (const w of text.split(" ")) {
  const k = w.toLowerCase();
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
const ranked = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
for (const [w, n] of ranked.slice(0, 3)) console.log(w, n);
console.log("unique", counts.size);
