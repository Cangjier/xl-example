// xl:title 遍历 Map 时删掉当前项：不跳过后一项
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
for (const [k, v] of m) { seen.push(k + v); if (k === "a") m.delete("a"); }
console.log(seen.join(","), m.size);
