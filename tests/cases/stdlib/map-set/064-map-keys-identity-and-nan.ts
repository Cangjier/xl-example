// xl:title Map 的键：NaN / ±0 / 对象身份 / 字符串与数字分开
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map<any, string>();
m.set(NaN, "nan"); m.set(-0, "zero"); m.set("1", "str"); m.set(1, "num");
console.log(m.size, m.get(NaN), m.get(0), m.get("1"), m.get(1));
m.set(NaN, "nan2");
console.log(m.size, m.get(NaN));
const k = {};
m.set(k, "obj");
console.log(m.get(k), m.get({}));
