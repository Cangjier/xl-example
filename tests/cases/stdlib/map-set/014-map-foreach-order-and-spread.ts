// xl:title Map 的遍历顺序与三种展开
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["b", 2], ["a", 1], ["c", 3]]);
m.set("d", 4);
const seen: string[] = [];
m.forEach((v, k) => seen.push(k + v));
console.log(seen.join(","));
console.log([...m.keys()].join(","), [...m.values()].join(","), [...m].length);
console.log(JSON.stringify([...m.entries()]));
