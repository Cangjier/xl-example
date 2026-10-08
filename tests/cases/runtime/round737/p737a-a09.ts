// xl:title 生成器对象自己是可迭代的（`Symbol.iterator` 给回自己）
// xl:round 737
// xl:judge stdout
// xl:end
function* g() { yield 1; yield 2; }
const it = g();
console.log(it[Symbol.iterator]() === it, [...it].join(","));
console.log([...it].join(","));
const it2 = g();
const [a, b] = it2;
console.log(a, b);
console.log(Object.prototype.toString.call(g()), typeof it.next, typeof it.return);
