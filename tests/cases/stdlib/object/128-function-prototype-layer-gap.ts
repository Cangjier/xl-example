// xl:title 函数的两条**原型**那一半还没接：`Function.prototype` 自己的格子与两个内建构造的原型种类
// xl:round 687
// xl:judge stdout
// xl:want differ
// xl:why 第 687 轮把**函数自己**那两格接上了（`f.length` / `f.name` 与它们的描述符，
//       判据 `127-function-own-descriptors`），剩下的差全在**原型那一半**：
//       ① 函数**不自以 `Function.prototype` 为原型**（本仓的内建构造是「普通对象 + 一格可调用载荷」，
//          闭包的 `Proto` 也不是它）⇒ `Object.getOwnPropertyNames(function f(){})` 少了
//          `arguments` / `caller`（Node 给 `arguments,caller,length,name,prototype`）；
//       ② `typeof Object.prototype` —— Node 给 `object`（`Object.prototype` 是**对象**，
//          只是它自己是个「函数式对象」的怪东西），本仓的 `Object.prototype` 打出来是 `function`；
//       ③ `Object.prototype.toLocaleString` 没装（`hasOwnProperty` / `isPrototypeOf` /
//          `propertyIsEnumerable` / `valueOf` 四格都有）。
//       三格同根：**内建构造与函数都不是真函数对象**（没有 `Function.prototype` 那一层）。
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
