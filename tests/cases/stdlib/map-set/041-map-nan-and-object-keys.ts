// xl:title Map 的键：NaN 与 ±0 的同一性
// xl:round 304
// xl:judge stdout
// xl:end

const m = new Map<any, string>();
m.set(NaN, "nan");
m.set(0, "zero");
m.set(-0, "negzero");
console.log(m.size, m.get(NaN), m.get(0), m.get(-0));
const o = {};
m.set(o, "obj");
console.log(m.get(o), m.get({}));
