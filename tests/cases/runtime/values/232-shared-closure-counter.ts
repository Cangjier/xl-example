// xl:title 值模型：对象标识（同一个对象两份引用），原始值按值比较
// xl:round 7
// xl:judge stdout
// xl:end

const a = { n: 1 };
const b = a;
const c = { n: 1 };
b.n = 2;
console.log(a.n, a === b, a === c, JSON.stringify(a) === JSON.stringify(c));
console.log(typeof null, [] === [], null === null, NaN === NaN, Object.is(NaN, NaN));
