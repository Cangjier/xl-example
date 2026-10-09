// xl:title 对象字面量里的类当构造器：`new ns["C"]()` 整份文件进不来（账）
// xl:round 694
// xl:judge stdout
// xl:want blocked
// xl:why **对象字面量里的类**当构造器（`const ns = { C: class { … } }; new ns.C()`）本仓报 `unimplemented: calling an object as a constructor (this object is not callable)`（**整份文件进不来**）——`new` 的被调者形状只认「标识符 / 括号」，认不出「成员访问交回来的类」。`new a.b.C()` 那一族整个待做。要做。
// xl:end
// 第 802 轮改名（原 `probe694-m31`）：`xl:want` / `xl:why` 与正文一字未动。
// 与 `exec/expressions/248-class-expressions-and-new` 的分工写在那边：点号那一格
// （`new ns.C()`）已经在 248 里通过，**下标那一格**（`new ns["C"]()`）是这一条账。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const ns = { C: class { constructor() { this.x = 3; } } }; return new ns["C"]().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
