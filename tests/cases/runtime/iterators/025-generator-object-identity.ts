// xl:title 生成器对象：迭代器 === 可迭代物、Symbol.iterator 返回自己、done 之后不再变
// xl:round 7
// xl:judge stdout
// xl:end

function* g() { yield 1; }
const it = g();
console.log(typeof it.next, it[Symbol.iterator]() === it);
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log([...g()].join(","), JSON.stringify([...g()]));
