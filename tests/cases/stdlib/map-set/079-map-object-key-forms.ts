// xl:title Map 的键：对象 / NaN / -0 / 迭代顺序
// xl:round 653
// xl:judge stdout
// xl:end

const m = new Map<any, any>();
const k1 = { id: 1 };
const k2 = () => 1;
m.set(k1, "obj").set(k2, "fn").set(NaN, "nan").set(-0, "zero").set(0, "zero2");
console.log(m.size, m.get(k1), m.get(k2), m.get(NaN), m.get(0), m.get(-0));
console.log([...m.keys()].map((k: any) => typeof k).join(","));
m.delete(NaN);
console.log(m.size, m.has(NaN));
