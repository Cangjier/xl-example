// xl:title 借来的那一格载荷：`(function* () {}).constructor("a", "yield a")`
// xl:round 730
// xl:judge stdout
// xl:want differ
// xl:why **动态造函数（`new Function` 那一族）本仓没做**：JS 里
// xl:why `%GeneratorFunction%("a", "yield a")` 与 `Function("a", "return a")` 是**同一件事**
// xl:why （从源码现造一个函数），而本仓的载荷号**借的就是 `FunctionCtor` 那一格**
// xl:why （343，见 `globals.xl.md` 那三格构造对象那一段）——它在 `InvokeGlobal` 里
// xl:why **没有分支** ⇒ 调它报 `unimplemented: builtin id 343`（Node 给一个生成器函数）。
// xl:why 与 `exec/functions/probe693b-f13` / `probe703-f-g09`（`new Function`）**同一条根**，
// xl:why 这一条只是把同一处钉在**新造的那三格构造对象**上：
// xl:why 不做动态代码生成时，那三格只能给到 `name` / `length` / `prototype` / `typeof`。
// xl:end
const gc = (function* () {}).constructor;
try {
  console.log(String(gc("a", "yield a")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
