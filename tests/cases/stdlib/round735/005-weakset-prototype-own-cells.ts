// xl:title `WeakSet.prototype` 上**只有四格**
// xl:round 735
// xl:judge stdout
// xl:end
// Node 里 `Object.getOwnPropertyNames(WeakSet.prototype)` 给
// `add, constructor, delete, has`——**四格**。
// 本仓原来把 `InstallSetMethods`（给 `Set.prototype` 用的那一整张表）也挂在弱集合上
// ⇒ `keys` / `values` / `entries` / `forEach` 与那七个集合运算**全都取得到**
//（连 `WeakSet.prototype.forEach` 都是函数，而 Node 给 `undefined`）——
// **没有的东西取得到**是**静默错值**。
const names = Object.getOwnPropertyNames(WeakSet.prototype).sort();
console.log(names.join(","));
console.log(typeof (WeakSet.prototype as any).add, typeof (WeakSet.prototype as any).has);
console.log(typeof (WeakSet.prototype as any).delete, typeof (WeakSet.prototype as any).forEach);
console.log(typeof (WeakSet.prototype as any).keys, typeof (WeakSet.prototype as any).union);
const w = new WeakSet<object>();
const key = {};
w.add(key);
console.log(w.has(key), w.delete(key), w.has(key));
console.log((WeakSet.prototype as any).add.name, (WeakSet.prototype as any).has.length);
