// xl:title Map 的键：对象按引用、NaN 按 SameValueZero
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map<any, string>();
const k1 = { id: 1 };
m.set(k1, "obj");
m.set(NaN, "nan");
m.set("1", "str");
console.log(m.get({ id: 1 }), m.get(k1), m.get(NaN), m.get("1"), m.size);
