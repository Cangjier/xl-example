// xl:title 空数组上装下标访问器：length 该跟着长
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why 同上：在**空数组**上给下标装一个访问器，JS 会把 `length` 顶到 `2`（下标一旦被定义
// xl:why 长度就要跟着长，与 `defineProperty(a, 3, { value: 5 })` 同一句）；
// xl:why 本仓访问器那一支**直接进 `Props` 就返回**，元素区一格没写 ⇒ 长度还是 0。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [];
Object.defineProperty(a, "1", { get() { return 5; }, enumerable: true, configurable: true });
console.log(show(a.length) + "," + show(a[1]) + "," + show(JSON.stringify(a)));
