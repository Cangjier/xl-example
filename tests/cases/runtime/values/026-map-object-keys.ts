// xl:title Map 用对象当键：按引用认
// xl:judge stdout
// xl:end

const m = new Map<any, string>();
const k1: any = { id: 1 };
const k2: any = { id: 1 };
m.set(k1, "a");
m.set(k2, "b");
console.log(m.get(k1), m.get(k2), m.get({ id: 1 }), m.size);
m.set(k1, "c");
console.log(m.get(k1), m.size);
