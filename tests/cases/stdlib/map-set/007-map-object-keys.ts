// xl:title Map 的键可以是对象、NaN 也算同一个键
// xl:judge stdout
// xl:end

const key = { id: 1 };
const m = new Map<any, string>();
m.set(key, "obj");
m.set(NaN, "nan");
console.log(m.get(key), m.get(NaN), m.get({ id: 1 }), m.size);
