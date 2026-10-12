// xl:title 内建可迭代对象：数组 / 字符串 / Map / Set / 生成器
// xl:round 371
// xl:judge stdout
// xl:end
const sources: [string, Iterable<unknown>][] = [
  ["array", [1, 2]],
  ["string", "ab"],
  ["map", new Map([["k", 1]])],
  ["set", new Set([1])],
  ["generator", (function* () { yield "g"; })()],
  ["entries", [1, 2].entries()],
];
for (const [name, it] of sources) console.log(name, [...it].length);
console.log([..."abc"].join("-"), [...new Set([1, 1, 2])].join(","));
function* range(n: number) { for (let i = 0; i < n; i++) yield i; }
console.log([...range(5)].join(","), Array.from(range(3)).join(","));
const [first, ...rest] = range(4);
console.log(first, rest.join(","));
