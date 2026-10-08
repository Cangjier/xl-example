// xl:title new Map([[1, 2]])["__k"] === undefined
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why **`Map` 的内部载荷是可见的自有属性**：`new Map([[1, 2]])["__k"]` 在 JS 里是 `undefined`，本仓拿得到那个内部表（`Map` / `Set` 在本仓做成「带几格隐藏属性的普通对象」，而**隐藏**只做到「不进 `Object.keys`」这一层）。要做就得让属性**读**那一侧也跳过隐藏格——那是引擎侧的一处改动，牵动面比这一条大，先记在这里。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Map([[1, 2]])["__k"] === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
