// xl:title 生成器走完之后 `next()` 恒为 `{ value: undefined, done: true }`
// xl:round 305
// xl:judge stdout
// xl:end

function* g() { yield 1; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
