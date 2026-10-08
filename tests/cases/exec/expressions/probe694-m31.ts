// xl:title (function () { const ns = { C: class { constructor() { this.x = 3; } } }; return new ns["C"]().x; })()
// xl:round 694
// xl:judge stdout
// xl:want blocked
// xl:why **对象字面量里的类**当构造器（`const ns = { C: class { … } }; new ns.C()`）本仓报 `unimplemented: calling an object as a constructor (this object is not callable)`（**整份文件进不来**）——`new` 的被调者形状只认「标识符 / 括号」，认不出「成员访问交回来的类」。`new a.b.C()` 那一族整个待做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const ns = { C: class { constructor() { this.x = 3; } } }; return new ns["C"]().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
