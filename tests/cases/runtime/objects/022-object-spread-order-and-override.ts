// xl:title 对象展开的顺序：后面的覆盖前面的，自己写的在最后
// xl:round 323
// xl:judge stdout
// xl:end

const base = { a: 1, b: 2 };
const o = { ...base, b: 3, ...{ c: 4 }, a: 9 };
console.log(Object.keys(o).join(","), o.a, o.b, o.c);
console.log(JSON.stringify({ ...base, ...{ a: 5 } }));
