// xl:title 迭代器工具：`map.keys()` / `entries()` / 手动推进
// xl:round 331
// xl:judge stdout
// xl:end

const scores = new Map<string, number>([["ada", 3], ["bob", 1], ["cy", 2]]);
const first = scores.keys().next();
console.log(first.value, first.done);
const all: string[] = [];
for (const [name, score] of scores.entries()) all.push(name + "=" + score);
console.log(all.join(","));
const sorted = [...scores.keys()].sort();
console.log(sorted.join(","));
const set = new Set<number>([10, 20]);
console.log(set.values().next().value, set.entries().next().value.join("-"));
console.log([...scores.values()].reduce((sum, n) => sum + n, 0));
