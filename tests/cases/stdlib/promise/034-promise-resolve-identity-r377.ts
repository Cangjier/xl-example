// xl:title `Promise.resolve` 的身份：已经是本族承诺就原样交回（thenable 那一半还没做）
// xl:round 377
// xl:judge stdout
// xl:end
const p = Promise.resolve(1);
console.log("A", Promise.resolve(p) === p, Promise.resolve(1) === Promise.resolve(1));
const q = p.then((v) => v + 1);
console.log("B", Promise.resolve(q) === q);
const nested = Promise.resolve(p);
console.log("C", nested === p, nested === q);
Promise.resolve(5).then((v) => console.log("D", v));
// 这一半还没做：Promise.resolve(thenable) 在 JS 里会**叫一次 then** ✓、
// 用它结清的那个值兑现 ✓（本仓把 thenable **本身**当成值收下了 ✓）。记在台账里。
const thenable = { then(resolve: any) { resolve(2); } };
console.log("E", Promise.resolve(thenable) === thenable);
