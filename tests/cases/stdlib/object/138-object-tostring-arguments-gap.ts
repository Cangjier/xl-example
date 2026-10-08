// xl:title `arguments` 的标签是 `Arguments`，不是 `Array`
// xl:round 690
// xl:judge stdout
// xl:want differ
// xl:why 本仓的 `arguments` **就是**一个数组（降级层把它造成数组，`length` / 下标 /
//       迭代都对），所以 `Object.prototype.toString.call(arguments)` 给 `"[object Array]"`、
//       `Array.isArray(arguments)` 给 `true`，而 Node 两处都给「不是数组」
//       （`"[object Arguments]"` / `false`）——JS 里它是一条**独立的异形对象**
//       （带 `[[ParameterMap]]` 那一格）。
//       要收它得先有「这个数组其实是 arguments」那一格标记，属于**建模那一层**的事；
//       今天先把它量出来登在这里（与 `Date` / `Map` 那几族的标记格同一个位置）。
// xl:end
function f(): void {
  console.log(Object.prototype.toString.call(arguments));
  console.log(Array.isArray(arguments), arguments.length, arguments[0]);
}
f(1, 2);
