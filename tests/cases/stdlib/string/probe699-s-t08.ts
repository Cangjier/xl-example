// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { toString() { return "k"; } }; console.log(show("abc".includes(o)) + "|" + show("abc".indexOf(o)));
// xl:round 699
// xl:judge stdout
// xl:want blocked
// xl:why 字符串搜索族的实参直接走 `JsTextUnits`（引擎的 `TextUnitsOf`），对象那一档要 `ToPrimitive`——`String(o)` 走的是 `ToPrimitiveOf`、这里走的是另一条，于是 `"abc".includes({ toString() { return "k"; } })` 报 `unimplemented: ToString of this kind of value`（JS 给假）。同一族还有 `indexOf` / `startsWith` / `endsWith` / `replace` 的模式位。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { toString() { return "k"; } };
console.log(show("abc".includes(o)) + "|" + show("abc".indexOf(o)));
