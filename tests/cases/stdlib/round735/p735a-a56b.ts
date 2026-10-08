// xl:title `console` 那一族的**名字与形参个数**
// xl:round 735
// xl:judge stdout
// xl:end
// 九个名字在 Node 里 `length` 全是 **0**（它们没有形参表）、`name` 就是自己的名字。
// 本仓第 733 轮给内建挂名字与长度时**没有走到这一族**（`console` 不在 `Math` /
// `Object` / `Function.prototype` 那几张表里），所以这一句是第 735 轮补的。
console.log(console.log.name, console.info.name, console.debug.name);
console.log(console.error.name, console.warn.name);
console.log(console.log.length, console.info.length, console.error.length, console.warn.length);
console.log(typeof console.error, typeof console.warn, typeof console.info, typeof console.debug);
console.log(typeof console.dir, typeof console.dirxml, typeof console.table);
