// xl:title Set 去重按引用：两个一样的对象是两个元素
// xl:judge stdout
// xl:end

const o1 = { v: 1 };
const o2 = { v: 1 };
const s = new Set<any>([o1, o2, o1, 1, 1, NaN, NaN, 0, -0]);
console.log(s.size, s.has(o1), s.has({ v: 1 }));
