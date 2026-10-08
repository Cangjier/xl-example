// xl:title (class A {}).toString()
// xl:round 704
// xl:judge stdout
// xl:want differ
// xl:why **类的 `toString()` 打出的是整份源码**（与第 703 轮登记的 `p703f-g23` **同一条根**）：类那条路造构造函数时走的是合成节点，它的 `[pos, end)` 落成了 `0..len`。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class A {}).toString()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
