// xl:title 端到端：Map / Set / Object 的键序与相等语义
// xl:round 639
// xl:judge stdout
// xl:end

const m = new Map<unknown, string>();
m.set(1, "num");
m.set("1", "str");
m.set(true, "bool");
m.set(1, "num2");
console.log(m.size, [...m.keys()].map((k) => typeof k).join(","));
console.log(m.get(1), m.get("1"), m.has(true));
const s = new Set<number>([1, 2, 2, 3, 1]);
console.log(s.size, [...s].join(""));
const obj: Record<string, number> = {};
obj["2"] = 2;
obj["1"] = 1;
obj["b"] = 3;
obj["a"] = 4;
console.log(Object.keys(obj).join(","));
