// xl:title Map / Set 与数组互转：spread、构造、Array.from
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log(Array.isArray([...m]), [...m].length, [...m][0].length);
console.log([...new Set([1, 1, 2])].join(","), Array.from(new Set("aab")).join(""));
const s = new Set([1, 2]);
console.log(Array.from(s, (v) => v * 2).join(","));
