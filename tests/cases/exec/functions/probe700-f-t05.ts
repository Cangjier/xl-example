// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function f() { return arguments[1]; } console.log(show(f(1, 2)) + "|" + show(typeof f.arguments));
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 函数对象自己的 `arguments` 那一格没装（JS 里非箭头函数都有这个访问器）：`typeof f.arguments` 该给 `"object"`，本仓给 `undefined`。与台账 `stdlib/object/128-function-prototype-layer-gap` / `probe2-d22` **同一条根**（`arguments` / `caller` 两格）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function f() { return arguments[1]; }
console.log(show(f(1, 2)) + "|" + show(typeof f.arguments));
