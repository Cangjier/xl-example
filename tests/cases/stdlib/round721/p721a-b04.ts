// xl:title defineProperty 的 length：削短（值、越界读、键）
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why **`length` 那一格没有异形语义**（`Object.defineProperty(a, "length", { value: 1 })`）：
// xl:why JS 把它**截到 1**（`a[1]` / `a[2]` 变 `undefined`、键只剩 `0`、`JSON` 给 `[1]`），
// xl:why 本仓**原样不动**。`a.length = 1` 那条**赋值**是好的（`props.xl.md` 的 `IsLengthKey`
// xl:why 那一支）——差的是**描述符**这条路（它走 `DefineOwnFromDescriptor`，那里没有 `length` 这一档）。
// xl:why 与 `stdlib/object/125-array-length-descriptor` / `exec/round707/p707b-d06` 同一条根。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
console.log(show(a.length) + "," + show(a[1]) + "," + show(a[2]) + "," + show(Object.keys(a).join(",")) + "," + show(JSON.stringify(a)));
