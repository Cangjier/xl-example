// xl:title `structuredClone`：Map / Set / Date 与循环引用
// xl:round 330
// xl:judge stdout
// xl:end

const map = new Map<string, number>([["a", 1]]);
const set = new Set<number>([1, 2]);
const date = new Date(0);
const cloned = structuredClone({ map, set, date });
console.log(cloned.map.get("a"), cloned.set.has(2), cloned.date.getTime());
const cyclic: any = { name: "root" };
cyclic.self = cyclic;
const copy = structuredClone(cyclic);
console.log(copy.name, copy.self === copy, copy.self.name);
