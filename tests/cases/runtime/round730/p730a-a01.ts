// xl:title 三档函数各自的标签、构造名与 inspect 写法（第 730 轮收的那一族）
// xl:round 730
// xl:judge stdout
// xl:end
function* gen() {}
async function af() {}
async function* agg() {}
console.log(gen);
console.log(af);
console.log(agg);
console.log(Object.prototype.toString.call(gen), Object.prototype.toString.call(af), Object.prototype.toString.call(agg));
console.log(gen.constructor.name, af.constructor.name, agg.constructor.name);
