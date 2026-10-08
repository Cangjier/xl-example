// xl:title 下标上的访问器：读那一格
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why **下标上的访问器读不到**：`defineProperty(a, "1", { get() { return 99 } })` 之后
// xl:why `a[1]` / `a.join()` / `JSON.stringify(a)` **三条路都读元素区**——访问器那一格确实躺在
// xl:why `Props` 里（描述符那一趟第 721 轮已经读得到它，判据 `p721a-r08` 是绿的），
// xl:why 可 `get_index` 这条快路径**没有调用通道**（`NativeCall`）⇒ 调不动 getter。
// xl:why 要做就得把通道一路递进 `GetIndex`，而元素区那三十来处读取（`join` / `map` / 迭代器 /
// xl:why `JSON`）也要跟着问一遍属性表——那是迭代协议那一层的活。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)) + "," + show(a.length));
