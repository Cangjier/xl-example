// xl:title 迭代 Map 时删掉当前项
// xl:round 304
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k, v] of m) {
  seen.push(k + "=" + v);
  if (k === "b") m.delete(k);
}
console.log(seen.join(","), m.size, [...m.keys()].join(","));
