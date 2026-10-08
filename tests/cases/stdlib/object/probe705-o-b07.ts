// xl:title Object.getOwnPropertyDescriptor(Math, "PI").writable
// xl:round 705
// xl:judge stdout
// xl:want differ
// xl:why **`Math` 的常量是可写的**：`Object.getOwnPropertyDescriptor(Math, "PI").writable` 在 JS 里是 `false`（`enumerable` / `configurable` 也都是假——规范把那几格定成不可写、不可枚举、不可配置），本仓挂的是普通属性 ⇒ 三个标志全真。装库那一趟用的是 `SetProperty`，要走一条带标志的路。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertyDescriptor(Math, "PI").writable));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
