// xl:title String.prototype.matchAll：成员本身在不在（用正则字面量取结果）
// xl:round 676
// xl:judge stdout
// xl:want blocked
// xl:why `String.prototype.matchAll` 没装：成员表里没有那一格，调用报 cannot call a non-closure value
// xl:end

console.log(typeof "abc".matchAll);
const matches = "abc".matchAll(/b/g);
console.log([...matches].map((m: any) => m[0] + "@" + m.index).join(" "));
