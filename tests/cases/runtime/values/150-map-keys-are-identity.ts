// xl:title Map 的键按同值零比较：NaN 与对象各是一个键
// xl:round 323
// xl:judge stdout
// xl:end

const m = new Map();
const key = {};
m.set(NaN, "nan");
m.set(key, "obj");
m.set("1", "str");
m.set(1, "num");
console.log(m.size, m.get(NaN), m.get(key), m.get("1"), m.get(1));
