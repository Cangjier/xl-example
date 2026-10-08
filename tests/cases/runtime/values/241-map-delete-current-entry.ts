// xl:title 遍历 Map 时删掉当前这一项（后续项照旧走完）
// xl:round 7
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2], ["c", 3], ["d", 4]]);
const seen: string[] = [];
for (const [k, v] of m) {
  seen.push(k + v);
  if (v % 2 === 0) m.delete(k);
}
console.log(seen.join(","), m.size, [...m.keys()].join(","));
