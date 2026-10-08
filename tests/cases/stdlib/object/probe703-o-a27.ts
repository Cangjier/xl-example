// xl:title Reflect.has({ a: 1 }, "a")
// xl:round 703
// xl:judge stdout
// xl:want blocked
// xl:why `Reflect` 整个没有装：这个名字在**降级期**就报 `name is not a local or a capture: Reflect`（`Reflect.ownKeys` / `get` / `has` / `deleteProperty` 四条一起）。要做——它与 `Proxy` 是同一批「元编程那一层」的构造，本仓一格都还没有。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Reflect.has({ a: 1 }, "a")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
