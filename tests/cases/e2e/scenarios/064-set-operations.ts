// xl:title `Set` 的集合运算与迭代
// xl:round 338
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log(a.size, a.has(2), b.has(2));
console.log([...a.union(b)].join(","));
console.log([...a.intersection(b)].join(","));
console.log([...a.difference(b)].join(","));
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isDisjointFrom(new Set([9])));
const seen: string[] = [];
a.forEach((v: number) => { seen.push("v" + v); });
console.log(seen.join(","), [...a.values()].join("-"), [...a.keys()].join("-"));
console.log([...a.entries()].map((e: number[]) => e.join(":")).join(" "));
