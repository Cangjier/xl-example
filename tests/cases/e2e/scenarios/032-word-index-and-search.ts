// xl:title 端到端：建一个倒排索引并做查询（只用字符串方法）
// xl:round 323
// xl:judge stdout
// xl:end

const docs: Record<string, string> = {
  d1: "the quick brown fox",
  d2: "the lazy dog sleeps",
  d3: "quick dogs and foxes",
};
const index = new Map<string, Set<string>>();
for (const id of Object.keys(docs)) {
  for (const raw of docs[id].split(" ")) {
    const w = raw.toLowerCase();
    if (!index.has(w)) index.set(w, new Set());
    index.get(w)!.add(id);
  }
}
function search(q: string): string {
  const hits = index.get(q.toLowerCase());
  return hits ? [...hits].sort().join(",") : "-";
}
console.log(search("the"), search("quick"), search("fox"), search("zzz"));
console.log(index.size, [...index.keys()].length);
