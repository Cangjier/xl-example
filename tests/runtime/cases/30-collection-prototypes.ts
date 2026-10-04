// 语料 30：`Map` / `Set` / `Date` 的 `instanceof` 与 `constructor`（第 138 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 137 轮把「内建构造函数 → 原型」那格登记表铺好了 ✓，
// 收尾时留下的第一条待办就是给这三族补上**自己的原型格** ✓——纯体力 ✓，但有两处坑 ✓：
//
//   ① **`Date` 不走登记表** ✗：它的全局值是**普通对象** ✓
//      （`new Date()` 第 114~144 轮由降级层落成一条 `host_call(DateCtor, …)` ✓，
//      **第 145 轮起走普通的路** ✓：那个对象自己带一格可调用载荷 ✓、
//      走 `Op.New` 的宿主分支 ✓，见 `heap.xl.md` 的 `AttachCallable` ✓），
//      所以那一格用「在对象上挂 `prototype` 属性」的老路 ✓
//      （与 `Array` / `Object` / `String` 同款 ✓）；而 `Map` / `Set` 是**宿主引用值** ✓，
//      **没有属性表** ✗，只能走登记表 ✓。——**同一条语义、两种接法** ✓，
//      选错的症状都一样：`instanceof` 抛「the right side of instanceof has no prototype object」✓。
//   ② **`constructor` 里必须放「全局那一份」那个值** ✗：内建函数的相等是**按句柄比**的 ✓
//      （`RtCmpEqStrict` 对 `HostRef` 比的是载荷句柄 ✓）——现造一个新句柄的话，
//      `new Map().constructor === Map` 给 **`false`** ✗（判据现场就是这么红的 ✓）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `Object.keys(new Map())` —— 本仓的 `Map` / `Set` / `Date` **把方法挂在实例上** ✓、
//     内部格（`__k` / `__v` / `size`）也是自有属性 ✓，所以键数不是 0 ✗
//     （JS 用内部槽 ✓，本仓的值模型没有那一层 ✗——**这是结构差**，不是漏挂 ✓）；
//   · `new Map(生成器)` / `new Set(生成器)` —— 要 `iter_next`，建库层够不着 ✗；
//   · `class X extends Map` —— 与 `extends Error` 同一条账 ✗（`super()` 落在内建构造函数上时抛 ✓）。

const map = new Map([["a", 1], ["b", 2]]);
const set = new Set([1, 2, 2, 3]);
const date = new Date(1500);

console.log("instanceof-family", map instanceof Map, set instanceof Set, date instanceof Date,
  map instanceof Object, set instanceof Object, date instanceof Object);
console.log("instanceof-cross", map instanceof Set, set instanceof Map, date instanceof Map,
  map instanceof Date);
console.log("constructor-chain", map.constructor === Map, set.constructor === Set,
  date.constructor === Date, [].constructor === Array, ({}).constructor === Object);
console.log("still-works", map.get("b"), map.size, set.has(2), set.size, date.getTime());
console.log("instanceof-after-use", (() => {
  map.set("c", 3);
  set.add(4);
  return map instanceof Map && set instanceof Set && map.size === 3 && set.size === 4;
})());
console.log("instanceof-in-catch", (() => {
  try {
    throw new TypeError("typed");
  } catch (error) {
    if (error instanceof TypeError && error instanceof Error) return "both";
    return "neither";
  }
})());
console.log("after", 1 + 1);
