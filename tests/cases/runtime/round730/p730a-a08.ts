// xl:title 标签之外 `call` / `apply` / `bind` 照旧沿链找得到
// xl:round 730
// xl:judge stdout
// xl:end
function* g() { yield 1; }
console.log(g.call === Function.prototype.call, g.apply === Function.prototype.apply, typeof g.bind);
console.log(typeof g.call(null), String(g.call(null)));
console.log(g.name, g.length);
