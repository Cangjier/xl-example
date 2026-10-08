// xl:title (function () { const o = { ["__proto__"]: { z: 1 } }; return Object.getPrototypeOf(o) === Object.prototype; })()
// xl:round 698
// xl:judge stdout
// xl:want differ
// xl:why **计算键写的 `__proto__` 不该改原型**：`{ ["__proto__"]: { z: 1 } }` 在 JS 里造的是**一格普通自有属性**（原型还是 `Object.prototype`），本仓**把原型改掉了**。根子在**对象字面量的成员走的是 `[[Set]]`**（`set_prop` / `set_index`），而 JS 那一步是 `CreateDataPropertyOrThrow`——第 697 轮给 `Object.prototype` 装上 `__proto__` 访问器之后，这一档才现形（同一根还有 `{ get a() { return 1; }, a: 2 }`：JS 给 `2`，本仓那个 getter 还在）。修法要一条「造自有数据属性」的路（`props.xl.md` 的 `CreateDataProperty` 就是它），**并让降级层改走它**——那一趟还要把「键的 `ToPropertyKey`」一起搬过去（`set_index` 那一支现在替我们做了这件事），是**另一处活**。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { ["__proto__"]: { z: 1 } }; return Object.getPrototypeOf(o) === Object.prototype; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
