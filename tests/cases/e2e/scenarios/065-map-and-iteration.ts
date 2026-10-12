// xl:title `Map` 的迭代、分组与 `Array.from`
// xl:round 338
// xl:judge stdout
// xl:end

const counts = new Map<string, number>();
for (const word of "b a b c a b".split(" ")) {
  counts.set(word, (counts.get(word) || 0) + 1);
}
console.log(counts.size, counts.get("b"), counts.has("z"));
console.log([...counts.keys()].join(","), [...counts.values()].join(","));
const grouped = new Map<string, string[]>();
for (const [k, v] of counts.entries()) {
  const key = v > 1 ? "many" : "one";
  if (!grouped.has(key)) grouped.set(key, []);
  (grouped.get(key) as string[]).push(k + ":" + v);
}
console.log([...grouped.entries()].map((e: any[]) => e[0] + "=" + e[1].join("/")).join(" "));
console.log(Array.from(counts.entries()).length, Array.from(counts.keys()).join("|"));
counts.delete("c");
console.log(counts.size, [...counts.keys()].join(","));
