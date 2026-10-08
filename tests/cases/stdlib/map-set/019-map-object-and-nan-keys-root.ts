// xl:title Map 的键：对象按引用、NaN 与 -0 / 0 同一格
// xl:judge stdout
// xl:end

const o = { k: 1 };
const m = new Map<any, string>();
m.set(o, "obj").set(NaN, "nan").set(0, "zero");
console.log(m.get(o), m.get({ k: 1 }), m.get(NaN), m.get(-0), m.size);
