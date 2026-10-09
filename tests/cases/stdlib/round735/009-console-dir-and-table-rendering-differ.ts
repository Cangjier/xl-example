// xl:title `dir` / `table` 的**专属渲染**还没做（登记缺口）
// xl:round 735
// xl:judge stdout
// xl:want differ
// xl:why 第 735 轮把这两个名字**挂上了**（原来取到 undefined ⇒ 调用报
//       `cannot call a non-closure value`），但它们的**专属渲染**是另外两件事：
//       `console.dir` 在 Node 里是「不按 `util.format` 走、永远用 `util.inspect` 且
//       默认带颜色/深度选项」，`console.table` 是「把对象/数组排成一张带框的表格」
//       （本仓连一张表都没有）。两处都**留在这里**而不是静默近似——
//       `dir` 现在给的是「`log` 那一份」，`table` 给的也是那一份。
//       **要收它得先定「本仓的表格长什么样」**（那是另一件事）。
// xl:end
console.dir({ a: 1 });
console.table([1, 2]);
