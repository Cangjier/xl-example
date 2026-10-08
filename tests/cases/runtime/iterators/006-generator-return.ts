// xl:title 生成器的 return：收尾那一步给的是返回值
// xl:judge stdout
// xl:end

function* g(): any { yield 1; yield 2; return "end"; }
const it = g();
const a = it.next();
const b = it.next();
const c = it.next();
const d = it.next();
console.log(a.value, a.done, b.value, b.done, c.value, c.done, d.done);
console.log([...g()].join(","));
