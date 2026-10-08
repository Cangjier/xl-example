// xl:title 下标上的访问器：读那一格
// xl:round 721
// xl:judge stdout
// xl:why **第 756 轮收掉了**（指令已撤、用例留着当守卫）：三条路现在都读得到那一格。
// xl:why **只改了 `join` 这一条**（第 756 轮）：它原来按元素区的格子数循环，
// xl:why 而装了访问器之后那一格是洞 ⇒ 循环一次都不进；现在上界是 `length` 那一格、
// xl:why 该格改走 `GetProperty`（判据 `IndexAccessorAt`，与 `RtOp.GetIndex` 同一句）。
// xl:why **另外两条路（迭代器 / `JSON`）是第 746 / 721 两轮分别收的**——
// xl:why 这一段账留着做历史：`get_index` 那条快路径原来没有调用通道。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)) + "," + show(a.length));
