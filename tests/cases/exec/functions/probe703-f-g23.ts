// xl:title (class A {}).toString()
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why **类的 `toString()` 打出的是整份源码**（**响亮的错值**）：`(class A { m() { return 1; } }).toString()`在 JS 里给 `class A { m() { return 1; } }`，本仓给**整个文件**（包括这一刻之前的所有语句）。根子在类那条路造构造函数时走的是**合成节点**，它的 `[pos, end)` 落成了 `0..len`（`SourceSliceOf` 那一段拿它切源码，`heap.xl.md` 的 `HeapClosure.Source`）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class A {}).toString()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
