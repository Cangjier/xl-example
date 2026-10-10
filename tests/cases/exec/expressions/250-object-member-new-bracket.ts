// xl:title 对象字面量里的类当构造器：`new ns["C"]()`
// xl:round 694
// xl:judge stdout
// xl:note 第 962 轮清账（`xl:want blocked` 与 `xl:why` 按规矩撤掉，用例留着当守卫）：
// 这一条**本轮之前就已经过了**（`new ns["C"]().x` 给 `3`），只是一直挂着
// 「整份文件进不来」那行台账——第 962 轮跑 `coverage` 时它落在「台账该更新了」那一栏里，
// 于是照规矩把台账撤掉。**正文一字未动**，它照旧量同一个形状。
// xl:end
// 第 802 轮改名（原 `probe694-m31`）：`xl:want` / `xl:why` 与正文一字未动。
// 与 `exec/expressions/248-class-expressions-and-new` 的分工写在那边：点号那一格
// （`new ns.C()`）已经在 248 里通过，**下标那一格**（`new ns["C"]()`）是这一条。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const ns = { C: class { constructor() { this.x = 3; } } }; return new ns["C"]().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
