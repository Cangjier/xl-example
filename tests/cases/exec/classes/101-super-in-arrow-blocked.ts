// xl:title 方法里的箭头函数用 `super`：`[[HomeObject]]` 取不到
// xl:round 788
// xl:judge stdout
// xl:want blocked
// xl:why **方法里的箭头函数用 `super`**（`class B extends A { m() { const f = () => super.m(); return f() + 1; } }`）本仓报 `get_proto needs an object receiver`（**整份文件进不来**）：`super` 那一格绑的是**当前环境**，而箭头函数另开了一层环境 ⇒ 取不到 `[[HomeObject]]`。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } class B extends A { m() { const f = () => super.m(); return f() + 1; } } return new B().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
