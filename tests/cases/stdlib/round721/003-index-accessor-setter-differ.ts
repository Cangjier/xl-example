// xl:title 下标上的访问器：get + set
// xl:round 797
// xl:judge stdout
// xl:want differ
// xl:why **下标上的 setter 调不到**（与上一条同根的另一半）：`a[1] = 7` 写的是元素区，
// xl:why 而 `set_index` 的签名里同样没有调用通道 ⇒ `store` 停在旧值上（Node 给 14）。
// xl:end
// 原 `stdlib/round721/p721a-b02`，第 797 轮按命名规范改名（**正文与台账一字未动**）。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
let store = 5;
Object.defineProperty(a, "1", { get() { return store; }, set(v) { store = v * 2; }, enumerable: true, configurable: true });
a[1] = 7;
console.log(show(store) + "," + show(a[1]) + "," + show(a.join(",")));
