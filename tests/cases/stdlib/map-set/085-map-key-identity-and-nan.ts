// xl:title Map 的键同一性：NaN 与 NaN、-0 与 0、对象按引用
// xl:judge stdout
// xl:end

const m = new Map<any, string>();
m.set(NaN, "nan");
m.set(-0, "zero");
m.set({}, "obj");
m.set({}, "obj2");
console.log(m.size, m.get(NaN), m.get(0), m.get(-0), m.get({}));
console.log([...m.keys()].map((k) => String(k)).join(","));
