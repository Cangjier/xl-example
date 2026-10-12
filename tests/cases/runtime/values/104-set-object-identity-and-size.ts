// xl:title Set 认对象身份，两个同形状的对象是两个元素
// xl:round 304
// xl:judge stdout
// xl:end

const s = new Set<any>();
const o1 = { a: 1 };
const o2 = { a: 1 };
s.add(o1);
s.add(o2);
s.add(o1);
console.log(s.size, s.has(o1), s.has({ a: 1 }), [...s].length);
