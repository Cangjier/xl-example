// xl:title (function () { class M extends Error {} const m = new M("x"); return [m.name, m.message, m instanceof Error].join(","); })()
// xl:round 697
// xl:judge stdout
// xl:want blocked
// xl:why **`class M extends Error {}` 写在函数体里**、再 `new M('x')` ⇒ 整份文件进不来：`heap object is not an environment`。同一个类写**在顶层**是对的（`runtime/async` 那一批外的一条实测），而**基类是用户类**（`class B extends A {}`）写在函数里也对——三档的差别缩到了「函数体 + 内建基类」这一格。根子在降级层与运行期之间那一处 `env_get`（帧的 `Env` 拿到的是那个内建构造函数对象，不是环境）。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class M extends Error {} const m = new M("x"); return [m.name, m.message, m instanceof Error].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
