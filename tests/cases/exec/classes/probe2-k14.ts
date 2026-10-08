// xl:title (function () { class A { [1 + 1]() { return "two"; } } return new A()[2](); })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why **计算键成员**（`class A { [1 + 1]() { return "two"; } }`）在降级层**明写不做**（`lowering.xl.md` 的 `LowerClass` 那一节：计算键成员与生成器 / async 方法一起列在「先做不做」里）——只是走到运行期才在一个**看不出关系的地方**抛（`set_hidden with a key that is not a string or a symbol`）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { [1 + 1]() { return "two"; } } return new A()[2](); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
