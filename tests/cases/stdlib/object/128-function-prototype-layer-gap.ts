// xl:title 函数的两条**原型**那一半还没接：`Function.prototype` 自己的格子与两个内建构造的原型种类
// xl:round 687
// xl:judge stdout
// xl:want differ
// xl:why 第 687 轮把**函数自己**那两格接上了（`f.length` / `f.name` 与它们的描述符，
//       判据 `127-function-own-descriptors`）；三格里**两格已经收了**：
//       ② `typeof Object.prototype` —— 第 690 轮在 `RtTypeOf` 里把 `protos.Object`
//          从「两个原型对象都算 function」那条判据里拿掉了（Node 给 `object`，
//          认错了会让 `typeof x === "function"` 这种守卫对 `Object.prototype` 判真）；
//       ③ `Object.prototype.toLocaleString` —— 第 689 轮装上了。
//       还剩①：函数**不自以 `Function.prototype` 为原型**（本仓的内建构造是
//       「普通对象 + 一格可调用载荷」，闭包的 `Proto` 也不是它）⇒
//       `Object.getOwnPropertyNames(function f(){})` 少了 `arguments` / `caller`
//       （Node 给 `arguments,caller,length,name,prototype`）。
//       收它要先把「函数对象」这一层做出来，不是补几格属性能了的——原样登在这里。
// xl:end

const ks = Object.getOwnPropertyNames(function f(): void {});
ks.sort();
console.log("fn-own-names", ks.join(","));

const names = ["Object", "Map", "Set", "Date", "Promise", "Error"];
const kinds: string[] = [];
for (const n of names) {
  const c: any = (globalThis as any)[n];
  kinds.push(n + "=" + typeof c.prototype);
}
console.log("prototype-kind", kinds.join(" "));

const o: any = {};
console.log("obj-proto-methods", typeof o.hasOwnProperty, typeof o.isPrototypeOf,
  typeof o.propertyIsEnumerable, typeof o.toLocaleString, typeof o.valueOf);
