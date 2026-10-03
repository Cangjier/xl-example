// 语料 29：`instanceof` 认内建构造函数 · 错误家族（第 137 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 136 轮收尾把「错误种类（`TypeError`）」列成下一步 ✓，
// 一进门量它，发现**整族 `instanceof` 都是红的** ✓：
// `[] instanceof Array` ✓、`new Map() instanceof Map` ✓、`new Error("x") instanceof Error` ✓
// 报的都是同一句「the right side of instanceof has no prototype object」✓。
//
//   ① **内建构造函数没有 `prototype` 可读** ✗：它们是 `HostRef` 值 ✓、**没有属性表** ✗，
//      所以 `GetProperty(它, "prototype")` 永远是 `undefined` ✗。修法是引擎给**一格** ✓
//      （`ConstructorProtos`：号 → 原型句柄 ✓）、语言层在建全局对象时登记 ✓
//      （`RegisterConstructorProto` ✓）。**引擎仍然不认识那几个号** ✓。
//   ② **`Array` / `Object` / `String` 是普通对象** ✓，直接挂 `prototype` 就行 ✓——
//      但那三格必须正好是 `Protos.Array` / `Object` / `String` ✗（挂一个新对象的话
//      `instanceof` 会一路走到底给 `false` ✓，而链上别的判断又都对 ✓——一半对一半错 ✓）。
//   ③ **原型链要接** ✗：`Array.prototype` / `String.prototype` / `Function.prototype`
//      自己的原型是 `Object.prototype` ✓——不接的话 `[1] instanceof Object` 给 `false` ✗
//      （而 `[] instanceof Array` 是对的 ✓，又是同一个形状 ✓）。
//   ④ **错误家族**：`Error` / `TypeError` / `RangeError` 三个构造函数 ✓ +
//      三格原型 ✓（后两者的原型是 `Error.prototype` ✓），
//      造出来的错误挂在**各自那一格**上 ✓——`new TypeError("t") instanceof Error` 因此成立 ✓。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · **`class MyErr extends Error`** ✗：`super(m)` 落在内建构造函数上时**响亮地抛** ✓——
//     那一族是「自己造一个新对象返回」那一款 ✓，而这个新对象会被丢掉 ✓、
//     `this` 上一个属性都没写 ✗（**症状是 `e.message` 空着** ✓，静默错值比抛糟得多 ✓）；
//   · **`e instanceof TypeError`（引擎自己抛的那种）** ✗：引擎抛的走错误工厂 ✓、
//     接得住 ✓，但工厂**只带一句话、不带种类** ✗——`null.y` 在 Node 里是 `TypeError` ✓；
//   · `e.stack` ✗（更早就记着的一条 ✓）；
//   · `new Map() instanceof Map` / `new Set() instanceof Set` ✗：那要给 `Map` / `Set`
//     各造一格原型 ✓（今天实例挂的是 `Object.prototype` ✓），是下一轮的第一条 ✓；
//   · `Function` 不是全局名 ✗、`Object.prototype.hasOwnProperty` 还没挂 ✗。

const plain = new Error("plain");
const typeError = new TypeError("wrong type");
const rangeError = new RangeError("out of range");
const called = Error("without new");

console.log("instanceof-builtins", [].constructor === Array, [] instanceof Array, {} instanceof Object,
  [1] instanceof Object, "x" instanceof Object);
console.log("instanceof-errors", plain instanceof Error, typeError instanceof Error,
  rangeError instanceof Error, typeError instanceof TypeError, rangeError instanceof RangeError,
  typeError instanceof RangeError, plain instanceof TypeError);
console.log("error-shape", plain.name, plain.message, typeError.name, typeError.message,
  rangeError.name, rangeError.message);
console.log("error-call-new", called.message, called instanceof Error, Error.prototype.name,
  Object.prototype === Array.prototype);
console.log("error-catch", (() => {
  try {
    throw new TypeError("boom");
  } catch (error) {
    if (error instanceof TypeError) return "typed:" + error.message;
    if (error instanceof Error) return "generic";
    return "unknown";
  }
})());
console.log("error-values", (() => {
  const kinds = [];
  for (const item of [new Error("a"), new TypeError("b"), new RangeError("c")]) {
    kinds.push(item.name + "/" + item.message);
  }
  return kinds.join(",");
})());
console.log("after", 1 + 1);
