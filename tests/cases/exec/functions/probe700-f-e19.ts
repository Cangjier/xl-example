// xl:title (function (a) { arguments[0] = 9; return a; })(1)
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 松散模式里 `arguments` 与形参之间那条**双向别名**没有（本仓的 `arguments` 是降级层造的**数组**，与形参各占一格）：`arguments[0] = 9` 之后 `a` 还是 `1`（Node 给 `9`）。与 `e47`（`arguments.callee`）/ `t05`（`f.arguments`）同一条根——「`arguments` 是一个真的 `arguments` 对象」这件事还没做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a) { arguments[0] = 9; return a; })(1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
