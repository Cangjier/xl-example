// xl:title 变位词分组与字符计数
// xl:round 371
// xl:judge stdout
// xl:end
function signature(word: string): string {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.keys()].sort().map((k) => k + counts.get(k)).join("");
}
function group(words: string[]): string[][] {
  const buckets = new Map<string, string[]>();
  for (const w of words) {
    const key = signature(w);
    const list = buckets.get(key) ?? [];
    list.push(w);
    buckets.set(key, list);
  }
  return [...buckets.values()].map((g) => g.sort()).sort((a, b) => a[0].localeCompare(b[0]));
}
const words = ["listen", "silent", "enlist", "google", "gogole", "cat", "act", "tac", "dog"];
for (const g of group(words)) console.log(g.join(","));
console.log(signature("listen") === signature("silent"), group([]).length);
console.log(group(["a"]).length, group(["ab", "ba", "abc"]).map((g) => g.length).join(""));
